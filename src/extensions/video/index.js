const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const formatMessage = require('format-message');
const log = require('../../util/log');
const VideoTarget = require('../../video/video-target.js');
const Thread = require('../../engine/thread.js');
const MathUtil = require('../../util/math-util.js');

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
                    opcode: 'playUntilDone',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'video.playUntilDone',
                        default: 'play video until done',
                        description: 'plays the video at the current rate while blocking the thread ' +
                                     'until reaching the end (or beginning if the rate is negative)'
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
                    opcode: 'goToFrame',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'video.goToFrame',
                        default: 'go to video frame [FRAME]',
                        description: 'sets the current video frame'
                    }),
                    arguments: {
                        FRAME: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        }
                    }
                },
                // {
                //     opcode: 'playFromTo',
                //     blockType: BlockType.COMMAND,
                //     text: formatMessage({
                //         id: 'video.playFromTo',
                //         default: 'play from frame [FROM] to frame [TO]',
                //         description: 'plays from one frame to another at the current playback, taking ' +
                //                      'into account playback direction and rate direction'
                //     }),
                //     arguments: {
                //         FROM: {
                //             type: ArgumentType.NUMBER,
                //             defaultValue: 0
                //         },
                //         TO: {
                //             type: ArgumentType.NUMBER,
                //             defaultValue: 300 // @TODO: How do we automatically set this to the final frame number?
                //         },
                //     }
                // },
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
                        default: 'change [EFFECT] effect by [VALUE]',
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
                            id: 'video.effectsMenu.crystallize',
                            default: 'crystallize',
                            description: 'label for crystallize element in effects picker for video extension'
                        }),
                        value: VideoEffects.CRYSTALLIZE
                    },
                    {
                        text: formatMessage({
                            id: 'video.effectsMenu.kaleidoscope',
                            default: 'kaleidoscope',
                            description: 'label for kaleidoscope element in effects picker for video extension'
                        }),
                        value: VideoEffects.KALEIDOSCOPE
                    }
                ]
            }
        };
    }

    playUntilDone(args, util) {
        var target = util.target;
        var thread = util.thread;
        if (util.stackFrame.playing) {
            var frameIncrement = ((util.runtime.currentStepTime / 1000.0) * (target.playbackRate / 100.0)) * target.fps;
            var nextFrame = target.currentFrame + frameIncrement;
            if (nextFrame < 0) {
                target.setCurrentFrame(0);
                util.stackFrame.playing = false;
                return;
            }
            else if (nextFrame > target.frames) {
                target.setCurrentFrame(target.frames);
                util.stackFrame.playing = false;
                return;
            }
            target.setCurrentFrame(nextFrame);
            thread.status = Thread.STATUS_YIELD_TICK;
        }
        else {
            util.stackFrame.playing = true;
            thread.status = Thread.STATUS_YIELD_TICK;
        }
    }

    setPlayRate(args, util) {
        util.target.setRate(args.RATE);
    }

    goToFrame(args, util) {
        util.target.setCurrentFrame(args.FRAME);
    }

    // playFromTo(args, util) {
    //     var target = util.target;
    //     if (util.stackFrame.playing) {
    //         var from = util.stackFrame.from;
    //         var to = util.stackFrame.to;
    //         var currentFrame = target.currentFrame;
    //         var rate = target.playbackRate;
    //         // Make sure the rate 
    //         if ((from > to && rate > 0) || (to < from && rate < 0)) {
    //             rate *= -1.0
    //         }
    //     }
    //     else {
    //         util.stackFrame.from = MathUtil.clamp(args.FROM, 0, target.frames);
    //         util.stackFrame.to = MathUtil.clamp(args.TO, 0, target.frames);

    //         util.stackFrame.playing = true;
    //         target.setCurrentFrame(util.stackFrame.from);
    //         thread.status = Thread.STATUS_YIELD_TICK;
    //     }
    // }

    nextFrame(args, util) {
        var target = util.target;
        target.setCurrentFrame(target.currentFrame + 1);
    }

    previousFrame(args, util) {
        var target = util.target;
        target.setCurrentFrame(target.currentFrame - 1);
    }

    changeEffectBy(args) {
        console.log('changeEffectBy');
        console.log(args);
    }

    setEffectTo(args) {
        console.log('setEffectTo');
        console.log(args);
    }
    
    clearVideoEffects() {
        console.log('clearVideoEffects');
    }

}

module.exports = SteinaVideoBlocks;
