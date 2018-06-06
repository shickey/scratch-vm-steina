const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const formatMessage = require('format-message');
const log = require('../../util/log');
const VideoTarget = require('../../video/video-target.js');
const Thread = require('../../engine/thread.js');
const MathUtil = require('../../util/math-util.js');
const Cast = require('../../util/cast');

/**
 * Icon svg to be displayed at the left edge of each extension block, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
// const blockIconURI = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI1MTJweCIgaGVpZ2h0PSI1MTJweCIgdmlld0JveD0iMCAwIDUxMiA1MTIiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDUxMiA1MTI7IiB4bWw6c3BhY2U9InByZXNlcnZlIj48Zz48cGF0aCBkPSJNMzAzLjcsMTI4aC0yMjFDNjMuOSwxMjgsNDcsMTQyLjEsNDcsMTYwLjd2MTg3LjljMCwxOC42LDE2LjksMzUuNCwzNS43LDM1LjRoMjIxYzE4LjgsMCwzMy4zLTE2LjgsMzMuMy0zNS40VjE2MC43QzMzNywxNDIuMSwzMjIuNSwxMjgsMzAzLjcsMTI4eiIvPjxwYXRoIGQ9Ik0zNjcsMjEzdjg1LjZsOTgsNTMuNFYxNjBMMzY3LDIxM3oiLz48L2c+PC9zdmc+';

const VideoEffects = {
    COLOR: "color",
    WHIRL: "whirl",
    CRYSTALLIZE: "crystallize",
    KALEIDOSCOPE: "kaleidoscope"
}

/**
 * Host for the video-related blocks in Steina
 * @param {Runtime} runtime - the runtime instantiating this block package.
 * @constructor
 */
class SteinaVideoBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        if (this.runtime) {
            this.runtime.on('PROJECT_STOP_ALL', () => {
                this.runtime.videoState.playing.forEach( vId => {
                    let target = this.runtime.getTargetById(vId)
                    target.setPlaying(false);
                });
            });
        }
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        return {
            id: 'video',
            name: 'Video',
            // blockIconURI: blockIconURI,
            blocks: [
                {
                    opcode: 'playEntireVideoUntilDone',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'video.playEntireVideoUntilDone',
                        default: 'play entire video until done',
                        description: 'plays the entire video at 100% playback rate from the first frame ' +
                                     'until reaching the last frame'
                    })
                },
                {
                    opcode: 'setPlayRate',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'video.setPlayRate',
                        default: 'set play rate to [RATE] %',
                        description: 'sets the playback rate of the video as a percentage'
                    }),
                    arguments: {
                        RATE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100
                        }
                    }
                },
                {
                    opcode: 'startPlaying',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'video.startPlaying',
                        default: 'start playing video',
                        description: 'plays the video at the current rate wihtout blocking the thread ' +
                                     'until reaching the end (or beginning if the rate is negative)'
                    })
                },
                {
                    opcode: 'stopPlaying',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'video.stopPlaying',
                        default: 'stop playing video',
                        description: 'stops the video at the current frame, if necessary'
                    })
                },
                {
                    opcode: 'goToFrame',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'video.goToFrame',
                        default: 'go to frame [FRAME]',
                        description: 'sets the current video frame'
                    }),
                    arguments: {
                        FRAME: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        }
                    }
                },
                {
                    opcode: 'playNFrames',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'video.playNFrames',
                        default: 'play [FRAMES] frames until done',
                        description: 'plays FRAMES frames at the current playback rate ' +
                                     'blocking the thread until completion'
                    }),
                    arguments: {
                        FRAMES: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 30 // One second
                        }
                    }
                },
                {
                    opcode: 'playForwardUntilDone',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'video.playForwardUntilDone',
                        default: 'play forward until done',
                        description: 'plays the video at the absolute value of the playback rate ' +
                                     'from the current frame until reaching the last frame'
                    })
                },
                {
                    opcode: 'playBackwardUntilDone',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'video.playBackwardUntilDone',
                        default: 'play backward until done',
                        description: 'plays the video at the negative absolute value of the playback rate ' +
                                     'from the current frame until reaching the first frame'
                    })
                },
                {
                    opcode: 'nextFrame',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'video.nextFrame',
                        default: 'go to next frame',
                        description: 'increments the current video frame'
                    })
                },
                {
                    opcode: 'previousFrame',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'video.previousFrame',
                        default: 'go to previous frame',
                        description: 'decrements the current video frame'
                    })
                },
                {
                    opcode: 'changeEffectBy',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'video.changeEffectBy',
                        default: 'change [EFFECT] effect by [CHANGE]',
                        description: 'changes the selected effect parameter by the specified value'
                    }),
                    arguments: {
                        EFFECT: {
                            type: ArgumentType.STRING,
                            menu: 'effects',
                            defaultValue: VideoEffects.COLOR
                        },
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 5
                        }
                    }
                },
                {
                    opcode: 'setEffectTo',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'video.setEffectTo',
                        default: 'set [EFFECT] effect to [VALUE]',
                        description: 'sets the effect parameter for the selected effect'
                    }),
                    arguments: {
                        EFFECT: {
                            type: ArgumentType.STRING,
                            menu: 'effects',
                            defaultValue: VideoEffects.COLOR
                        },
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 5
                        }
                    }
                },
                {
                    opcode: 'clearVideoEffects',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'video.clearVideoEffects',
                        default: 'clear video effects',
                        description: 'reset video effects state to the default'
                    })
                },
                {
                    opcode: 'whenPlayedToEnd',
                    text: 'when played to end',
                    blockType: BlockType.HAT
                },
                {
                    opcode: 'whenPlayedToBeginning',
                    text: 'when played to beginning',
                    blockType: BlockType.HAT
                },
                {
                    opcode: 'whenTapped',
                    text: 'when tapped',
                    blockType: BlockType.HAT
                },
                {
                    opcode: 'getCurrentFrame',
                    text: 'current frame',
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'getTotalFrames',
                    text: 'total frames',
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'getPlayRate',
                    text: 'play rate',
                    blockType: BlockType.REPORTER
                }
            ],
            menus: {
                effects: [
                    {
                        text: formatMessage({
                            id: 'video.effectsMenu.color',
                            default: 'color',
                            description: 'label for color element in effects picker for video extension'
                        }),
                        value: VideoEffects.COLOR
                    },
                    {
                        text: formatMessage({
                            id: 'video.effectsMenu.whirl',
                            default: 'whirl',
                            description: 'label for whirl element in effects picker for video extension'
                        }),
                        value: VideoEffects.WHIRL
                    },
                    {
                        text: formatMessage({
                            id: 'video.effectsMenu.brightness',
                            default: 'brightness',
                            description: 'label for brightness element in effects picker for video extension'
                        }),
                        value: VideoEffects.BRIGHTNESS
                    },
                    {
                        text: formatMessage({
                            id: 'video.effectsMenu.ghost',
                            default: 'ghost',
                            description: 'label for ghost element in effects picker for video extension'
                        }),
                        value: VideoEffects.GHOST
                    }
                    // {
                    //     text: formatMessage({
                    //         id: 'video.effectsMenu.crystallize',
                    //         default: 'crystallize',
                    //         description: 'label for crystallize element in effects picker for video extension'
                    //     }),
                    //     value: VideoEffects.CRYSTALLIZE
                    // },
                    // {
                    //     text: formatMessage({
                    //         id: 'video.effectsMenu.kaleidoscope',
                    //         default: 'kaleidoscope',
                    //         description: 'label for kaleidoscope element in effects picker for video extension'
                    //     }),
                    //     value: VideoEffects.KALEIDOSCOPE
                    // }
                ]
            }
        };
    }

    playEntireVideoUntilDone(args, util) {
        var target = util.target;
        var thread = util.thread;
        if (util.stackFrame.playing) {
            // We play the video at the normal 100% rate (but we don't change the rate property)
            // @TODO: Does this make sense? Should we update the rate? Should there be a rate
            //        argument available on the block?
            var frameIncrement = ((util.runtime.currentStepTime / 1000.0) * target.fps);
            var nextFrame = target.currentFrame + frameIncrement;
            if (nextFrame < 0) {
                target.setCurrentFrame(0);
                util.stackFrame.playing = false;
                return;
            }
            else if (nextFrame >= (target.frames - 1)) {
                target.setCurrentFrame(target.frames - 1);
                util.stackFrame.playing = false;
                return;
            }
            target.setCurrentFrame(nextFrame);
            thread.status = Thread.STATUS_YIELD_TICK;
        }
        else {
            util.stackFrame.playing = true;
            target.setCurrentFrame(0);
            thread.status = Thread.STATUS_YIELD_TICK;
        }
    }

    setPlayRate(args, util) {
        util.target.setRate(args.RATE);
    }

    startPlaying(args, util) {
        var target = util.target;
        if (target.playing) { return; }
        target.setPlaying(true);
    }

    stopPlaying(args, util) {
        var target = util.target;
        if (!target.playing) { return; }
        target.setPlaying(false);
    }

    goToFrame(args, util) {
        // Frames are 1-indexed in the blocks, but 0-indexed in the target
        util.target.setCurrentFrame(args.FRAME - 1);
    }

    playNFrames(args, util) {
        var target = util.target;
        var thread = util.thread;
        if (util.stackFrame.playing) {
            var frameIncrement = ((util.runtime.currentStepTime / 1000.0) * (target.playbackRate / 100.0)) * target.fps;
            var nextFrame = target.currentFrame + frameIncrement;
            if ((target.playbackRate < 0 && nextFrame <= util.stackFrame.targetFrame) ||
                (target.playbackRate >= 0 && nextFrame >= util.stackFrame.targetFrame)) {
                util.stackFrame.playing = false;
                target.setCurrentFrame(nextFrame)
                return;
            }
            target.setCurrentFrame(nextFrame)
            thread.status = Thread.STATUS_YIELD_TICK;
        }
        else {
            var framesToPlay = +(args.FRAMES);
            if (target.playbackRate < 0) {
                framesToPlay *= -1.0
            }
            var targetFrame = MathUtil.clamp(target.currentFrame + framesToPlay, 0, target.frames - 1);
            util.stackFrame.playing = true;
            util.stackFrame.targetFrame = targetFrame;
            thread.status = Thread.STATUS_YIELD_TICK;
        }
    }

    playForwardUntilDone(args, util) {
        var target = util.target;
        var thread = util.thread;
        if (util.stackFrame.playing) {
            var frameIncrement = ((util.runtime.currentStepTime / 1000.0) * (Math.abs(target.playbackRate) / 100.0)) * target.fps;
            var nextFrame = target.currentFrame + frameIncrement;
            if (nextFrame >= util.stackFrame.targetFrame) {
                util.stackFrame.playing = false;
                target.setCurrentFrame(util.stackFrame.targetFrame)
                return;
            }
            target.setCurrentFrame(nextFrame)
            thread.status = Thread.STATUS_YIELD_TICK;
        }
        else {
            util.stackFrame.playing = true;
            util.stackFrame.targetFrame = target.frames - 1;
            thread.status = Thread.STATUS_YIELD_TICK;
        }
    }

    playBackwardUntilDone(args, util) {
        var target = util.target;
        var thread = util.thread;
        if (util.stackFrame.playing) {
            var frameIncrement = ((util.runtime.currentStepTime / 1000.0) * (-Math.abs(target.playbackRate) / 100.0)) * target.fps;
            var nextFrame = target.currentFrame + frameIncrement;
            if (nextFrame <= util.stackFrame.targetFrame) {
                util.stackFrame.playing = false;
                target.setCurrentFrame(util.stackFrame.targetFrame)
                return;
            }
            target.setCurrentFrame(nextFrame)
            thread.status = Thread.STATUS_YIELD_TICK;
        }
        else {
            util.stackFrame.playing = true;
            util.stackFrame.targetFrame = 0;
            thread.status = Thread.STATUS_YIELD_TICK;
        }
    }

    nextFrame(args, util) {
        var target = util.target;
        target.setCurrentFrame(target.currentFrame + 1);
    }

    previousFrame(args, util) {
        var target = util.target;
        target.setCurrentFrame(target.currentFrame - 1);
    }

    changeEffectBy(args, util) {
        const effect = Cast.toString(args.EFFECT).toLowerCase();
        const change = Cast.toNumber(args.CHANGE);
        if (!util.target.effects.hasOwnProperty(effect)) return;
        const newValue = change + util.target.effects[effect];
        util.target.setEffect(effect, newValue);
    }

    setEffectTo(args, util) {
        const effect = Cast.toString(args.EFFECT).toLowerCase();
        const value = Cast.toNumber(args.VALUE);
        util.target.setEffect(effect, value);
    }
    
    clearVideoEffects(args, util) {
        util.target.clearEffects();
    }

    whenPlayedToEnd(args, util) {
        var target = util.target;
        if (target.currentFrame == target.frames - 1) {
            return true;
        }
        return false;
    }

    whenPlayedToBeginning(args, util) {
        var target = util.target;
        if (target.currentFrame == 0) {
            return true;
        }
        return false;
    }

    whenTapped(args, util) {
        var target = util.target;
        if (target.tapped) {
            target.tapped = false;
            return true;
        }
        return false;
    }

    getCurrentFrame(args, util) {
        // @TODO: Should this return an integer or a float? We're going with integer for now
        var target = util.target;
        return +(target.currentFrame) + 1; // 1-indexed
    }

    getTotalFrames(args, util) {
        return util.target.frames;
    }

    getPlayRate(args, util) {
        return util.target.playbackRate;
    }

}

module.exports = SteinaVideoBlocks;
