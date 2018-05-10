const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const formatMessage = require('format-message');
const log = require('../../util/log');

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
                        description: 'plays the video from beginning to end while blocking the thread'
                    })
                },
                {
                    opcode: 'start',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'video.start',
                        default: 'start video',
                        description: 'starts the video playing without blocking the thread'
                    })
                },
                {
                    opcode: 'rotateRightBy',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'video.rotateRightBy',
                        default: 'rotate right [VALUE] degrees',
                        description: 'rotates the video clockwise the specified number of degrees'
                    }),
                    arguments: {
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 5
                        }
                    }
                },
                {
                    opcode: 'rotateLeftBy',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'video.rotateLeftBy',
                        default: 'rotate left [VALUE] degrees',
                        description: 'rotates the video counterclockwise the specified number of degrees'
                    }),
                    arguments: {
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 5
                        }
                    }
                },
                {
                    opcode: 'setRotation',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'video.setRotation',
                        default: 'set rotation to [VALUE] degrees',
                        description: 'sets the rotation angle on the current video'
                    }),
                    arguments: {
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        }
                    }
                },
                {
                    opcode: 'changeSizeBy',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'video.changeSizeBy',
                        default: 'change size by [VALUE]',
                        description: 'changes the size percentage of the current video by the specified units'
                    }),
                    arguments: {
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 10
                        }
                    }
                },
                {
                    opcode: 'setSize',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'video.setSize',
                        default: 'set size to [VALUE] %',
                        description: 'sets the size of the current video'
                    }),
                    arguments: {
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100
                        }
                    }
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

    playUntilDone() {
        console.log('playUntilDone');
    }

    start() {
        console.log('startVideo');
    }

    rotateRightBy(args) {
        console.log('rotateRightBy');
        console.log(args);
    }

    rotateLeftBy(args) {
        console.log('rotateLeftBy');
        console.log(args);
    }

    setRotation(args) {
        console.log('setRotation');
        console.log(args);
    }

    changeSizeBy(args) {
        console.log('changeSizeBy');
        console.log(args);
    }

    setSize(args) {
        console.log('setSize');
        console.log(args);
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
