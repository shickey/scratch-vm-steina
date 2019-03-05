const Timer = require('../util/timer');
const Thread = require('./thread');
const execute = require('./execute.js');

/**
 * Profiler frame name for stepping a single thread.
 * @const {string}
 */
const stepThreadProfilerFrame = 'Sequencer.stepThread';

/**
 * Profiler frame name for the inner loop of stepThreads.
 * @const {string}
 */
const stepThreadsInnerProfilerFrame = 'Sequencer.stepThreads#inner';

/**
 * Profiler frame name for execute.
 * @const {string}
 */
const executeProfilerFrame = 'execute';

/**
 * Profiler frame ID for stepThreadProfilerFrame.
 * @type {number}
 */
let stepThreadProfilerId = -1;

/**
 * Profiler frame ID for stepThreadsInnerProfilerFrame.
 * @type {number}
 */
let stepThreadsInnerProfilerId = -1;

/**
 * Profiler frame ID for executeProfilerFrame.
 * @type {number}
 */
let executeProfilerId = -1;

class Sequencer {
    constructor (runtime) {
        /**
         * A utility timer for timing thread sequencing.
         * @type {!Timer}
         */
        this.timer = new Timer();

        /**
         * Reference to the runtime owning this sequencer.
         * @type {!Runtime}
         */
        this.runtime = runtime;
    }

    /**
     * Time to run a warp-mode thread, in ms.
     * @type {number}
     */
    static get WARP_TIME () {
        return 500;
    }

    /**
     * Step through all threads in `this.runtime.threads`, running them in order.
     * @return {Array.<!Thread>} List of inactive threads after stepping.
     */
    stepThreads () {
        // @NOTE (sean): We redefine the work time to be only 1/3 of the step
        //               time which at 30 FPS is ~11ms
        const WORK_TIME = 0.33 * this.runtime.currentStepTime;
        // Start counting toward WORK_TIME.
        this.timer.start();
        // Count of active threads.
        let numActiveThreads = Infinity;
        // Whether `stepThreads` has run through a full single tick.
        let ranFirstTick = false;
        const doneThreads = this.runtime.threads.map(() => null);
        // Conditions for continuing to stepping threads:
        // 1. We must have threads in the list, and some must be active.
        // 2. Time elapsed must be less than WORK_TIME.
        // 3. Either turbo mode, or no redraw has been requested by a primitive.
        while (this.runtime.threads.length > 0 &&
               numActiveThreads > 0 &&
               this.timer.timeElapsed() < WORK_TIME &&
               (this.runtime.turboMode || !this.runtime.redrawRequested)) {
            if (this.runtime.profiler !== null) {
                if (stepThreadsInnerProfilerId === -1) {
                    stepThreadsInnerProfilerId = this.runtime.profiler.idByName(stepThreadsInnerProfilerFrame);
                }
                this.runtime.profiler.start(stepThreadsInnerProfilerId);
            }
            numActiveThreads = 0;
            // Attempt to run each thread one time.
            for (let i = 0; i < this.runtime.threads.length; i++) {
                const activeThread = this.runtime.threads[i];
                if (activeThread.stack.length === 0 ||
                    activeThread.status === Thread.STATUS_DONE) {
                    // Finished with this thread.
                    doneThreads[i] = activeThread;
                    continue;
                }
                // A thread was removed, added or this thread was restarted.
                if (doneThreads[i] !== null) {
                    doneThreads[i] = null;
                }
                if (activeThread.status === Thread.STATUS_YIELD_TICK &&
                    !ranFirstTick) {
                    // Clear single-tick yield from the last call of `stepThreads`.
                    activeThread.status = Thread.STATUS_RUNNING;
                }
                if (activeThread.status === Thread.STATUS_RUNNING ||
                    activeThread.status === Thread.STATUS_YIELD) {
                    // Normal-mode thread: step.
                    if (this.runtime.profiler !== null) {
                        if (stepThreadProfilerId === -1) {
                            stepThreadProfilerId = this.runtime.profiler.idByName(stepThreadProfilerFrame);
                        }
                        this.runtime.profiler.start(stepThreadProfilerId);
                    }
                    this.stepThread(activeThread);
                    if (this.runtime.profiler !== null) {
                        this.runtime.profiler.stop();
                    }
                    activeThread.warpTimer = null;
                    if (activeThread.isKilled) {
                        i--; // if the thread is removed from the list (killed), do not increase index
                    }
                }
                if (activeThread.status === Thread.STATUS_RUNNING) {
                    numActiveThreads++;
                }
            }
            // We successfully ticked once. Prevents running STATUS_YIELD_TICK
            // threads on the next tick.
            ranFirstTick = true;

            if (this.runtime.profiler !== null) {
                this.runtime.profiler.stop();
            }
        }
        // Filter inactive threads from `this.runtime.threads`.
        numActiveThreads = 0;
        for (let i = 0; i < this.runtime.threads.length; i++) {
            const thread = this.runtime.threads[i];
            if (doneThreads[i] === null) {
                this.runtime.threads[numActiveThreads] = thread;
                numActiveThreads++;
            }
        }
        this.runtime.threads.length = numActiveThreads;

        // Filter undefined and null values from `doneThreads`.
        let numDoneThreads = 0;
        for (let i = 0; i < doneThreads.length; i++) {
            const maybeThread = doneThreads[i];
            if (maybeThread !== null) {
                doneThreads[numDoneThreads] = maybeThread;
                numDoneThreads++;
            }
        }
        doneThreads.length = numDoneThreads;

        // @NOTE (sean):
        // Here's where we update the current frame for any videos
        // that are current playing in a non-blocking way.
        var playingVideoIds = this.runtime.videoState.playing;
        var doneVideoIds = [];
        for (let i = 0; i < playingVideoIds.length; ++i) {
            let targetId = playingVideoIds[i];
            let target = this.runtime.getTargetById(targetId);
            var frameIncrement = ((this.runtime.currentStepTime / 1000.0) * (target.playbackRate / 100.0)) * target.fps;
            var nextFrame = target.currentFrame + frameIncrement;
            if (nextFrame <= target.trimStart) {
                target.setCurrentFrame(target.trimStart);
                target.playing = false; // We purposefully don't use the accessor here
                                        // since that would try to remove the video from
                                        // the play queue immediately
                doneVideoIds.push(targetId);
            }
            else if (nextFrame >= target.trimEnd) {
                target.setCurrentFrame(target.trimEnd);
                target.playing = false;
                doneVideoIds.push(targetId);
            }
            else {
                target.setCurrentFrame(nextFrame);
            }
        }

        this.runtime.videoState.playing = playingVideoIds.filter( id => {
            // Remove all videos that have been added to the doneVideoIds array
            return (doneVideoIds.indexOf(id) === -1)
        })

        // @NOTE (sean):
        // And similarly for playing sounds
        var playingSounds = this.runtime.audioState.playing;
        var playingSoundIdsToRemove = [];
        for (var playingSoundId in playingSounds) {
            var sound = playingSounds[playingSoundId];

            // If the sound finished on the last frame, schedule it for removal
            if (sound.playhead == sound.end) {
                playingSoundIdsToRemove.push(playingSoundId);
                continue;
            }

            var sampleIncrement = (this.runtime.currentStepTime / 1000.0) * sound.sampleRate;
            var nextPlayhead = sound.playhead + sampleIncrement;
            if (nextPlayhead > sound.end) {
                nextPlayhead = sound.end;
            }
            sound.prevPlayhead = sound.playhead;
            sound.playhead = nextPlayhead;
        }

        // Remove all finished sounds
        playingSoundIdsToRemove.forEach( id => {
            var soundToDelete = playingSounds[id];

            // If this is a nonblocking sound, increment the counter
            // to allow new sounds to get queued
            if (!soundToDelete.blocking) {
                var targetId = soundToDelete.audioTargetId;
                var target = this.runtime.getTargetById(targetId);
                target.nonblockingSoundsAvailable++;
            }

            delete this.runtime.audioState.playing[id];
        })

        return doneThreads;
    }

    /**
     * Step the requested thread for as long as necessary.
     * @param {!Thread} thread Thread object to step.
     */
    stepThread (thread) {
        let currentBlockId = thread.peekStack();
        if (!currentBlockId) {
            // A "null block" - empty branch.
            thread.popStack();
        }
        // Save the current block ID to notice if we did control flow.
        while ((currentBlockId = thread.peekStack())) {
            let isWarpMode = thread.peekStackFrame().warpMode;
            if (isWarpMode && !thread.warpTimer) {
                // Initialize warp-mode timer if it hasn't been already.
                // This will start counting the thread toward `Sequencer.WARP_TIME`.
                thread.warpTimer = new Timer();
                thread.warpTimer.start();
            }
            // Execute the current block.
            if (this.runtime.profiler !== null) {
                if (executeProfilerId === -1) {
                    executeProfilerId = this.runtime.profiler.idByName(executeProfilerFrame);
                }
                // The method commented below has its code inlined underneath to
                // reduce the bias recorded for the profiler's calls in this
                // time sensitive stepThread method.
                //
                // this.runtime.profiler.start(executeProfilerId, null);
                this.runtime.profiler.records.push(
                    this.runtime.profiler.START, executeProfilerId, null, performance.now());
            }
            if (thread.target === null) {
                this.retireThread(thread);
            } else {
                execute(this, thread);
            }
            if (this.runtime.profiler !== null) {
                // this.runtime.profiler.stop();
                this.runtime.profiler.records.push(this.runtime.profiler.STOP, performance.now());
            }
            thread.blockGlowInFrame = currentBlockId;
            // If the thread has yielded or is waiting, yield to other threads.
            if (thread.status === Thread.STATUS_YIELD) {
                // Mark as running for next iteration.
                thread.status = Thread.STATUS_RUNNING;
                // In warp mode, yielded blocks are re-executed immediately.
                if (isWarpMode &&
                    thread.warpTimer.timeElapsed() <= Sequencer.WARP_TIME) {
                    continue;
                }
                return;
            } else if (thread.status === Thread.STATUS_PROMISE_WAIT) {
                // A promise was returned by the primitive. Yield the thread
                // until the promise resolves. Promise resolution should reset
                // thread.status to Thread.STATUS_RUNNING.
                return;
            } else if (thread.status === Thread.STATUS_YIELD_TICK) {
                // We return here so that the thread won't be marked
                // as STATUS_DONE below and will remain as STATUS_YIELD_TICK
                // until reset to STATUS_RUNNING by the next tick
                return;
            }
            // If no control flow has happened, switch to next block.
            if (thread.peekStack() === currentBlockId) {
                thread.goToNextBlock();
            }
            // If no next block has been found at this point, look on the stack.
            while (!thread.peekStack()) {
                thread.popStack();

                if (thread.stack.length === 0) {
                    // No more stack to run!
                    thread.status = Thread.STATUS_DONE;
                    return;
                }

                const stackFrame = thread.peekStackFrame();
                isWarpMode = stackFrame.warpMode;

                if (stackFrame.isLoop) {
                    // The current level of the stack is marked as a loop.
                    // Return to yield for the frame/tick in general.
                    // Unless we're in warp mode - then only return if the
                    // warp timer is up.
                    if (!isWarpMode ||
                        thread.warpTimer.timeElapsed() > Sequencer.WARP_TIME) {
                        // Don't do anything to the stack, since loops need
                        // to be re-executed.
                        return;
                    }
                    // Don't go to the next block for this level of the stack,
                    // since loops need to be re-executed.
                    continue;

                } else if (stackFrame.waitingReporter) {
                    // This level of the stack was waiting for a value.
                    // This means a reporter has just returned - so don't go
                    // to the next block for this level of the stack.
                    return;
                }
                // Get next block of existing block on the stack.
                thread.goToNextBlock();
            }
        }
    }

    /**
     * Step a thread into a block's branch.
     * @param {!Thread} thread Thread object to step to branch.
     * @param {number} branchNum Which branch to step to (i.e., 1, 2).
     * @param {boolean} isLoop Whether this block is a loop.
     */
    stepToBranch (thread, branchNum, isLoop) {
        if (!branchNum) {
            branchNum = 1;
        }
        const currentBlockId = thread.peekStack();
        const branchId = thread.target.blocks.getBranch(
            currentBlockId,
            branchNum
        );
        thread.peekStackFrame().isLoop = isLoop;
        if (branchId) {
            // Push branch ID to the thread's stack.
            thread.pushStack(branchId);
        } else {
            thread.pushStack(null);
        }
    }

    /**
     * Step a procedure.
     * @param {!Thread} thread Thread object to step to procedure.
     * @param {!string} procedureCode Procedure code of procedure to step to.
     */
    stepToProcedure (thread, procedureCode) {
        const definition = thread.target.blocks.getProcedureDefinition(procedureCode);
        if (!definition) {
            return;
        }
        // Check if the call is recursive.
        // If so, set the thread to yield after pushing.
        const isRecursive = thread.isRecursiveCall(procedureCode);
        // To step to a procedure, we put its definition on the stack.
        // Execution for the thread will proceed through the definition hat
        // and on to the main definition of the procedure.
        // When that set of blocks finishes executing, it will be popped
        // from the stack by the sequencer, returning control to the caller.
        thread.pushStack(definition);
        // In known warp-mode threads, only yield when time is up.
        if (thread.peekStackFrame().warpMode &&
            thread.warpTimer.timeElapsed() > Sequencer.WARP_TIME) {
            thread.status = Thread.STATUS_YIELD;
        } else {
            // Look for warp-mode flag on definition, and set the thread
            // to warp-mode if needed.
            const definitionBlock = thread.target.blocks.getBlock(definition);
            const innerBlock = thread.target.blocks.getBlock(
                definitionBlock.inputs.custom_block.block);
            let doWarp = false;
            if (innerBlock && innerBlock.mutation) {
                const warp = innerBlock.mutation.warp;
                if (typeof warp === 'boolean') {
                    doWarp = warp;
                } else if (typeof warp === 'string') {
                    doWarp = JSON.parse(warp);
                }
            }
            if (doWarp) {
                thread.peekStackFrame().warpMode = true;
            } else if (isRecursive) {
                // In normal-mode threads, yield any time we have a recursive call.
                thread.status = Thread.STATUS_YIELD;
            }
        }
    }

    /**
     * Retire a thread in the middle, without considering further blocks.
     * @param {!Thread} thread Thread object to retire.
     */
    retireThread (thread) {
        thread.stack = [];
        thread.stackFrame = [];
        thread.requestScriptGlowInFrame = false;
        thread.status = Thread.STATUS_DONE;
    }
}

module.exports = Sequencer;
