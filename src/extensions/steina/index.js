const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const formatMessage = require('format-message');
const log = require('../../util/log');
const VideoTarget = require('../../steina/video-target.js');
const AudioTarget = require('../../steina/audio-target.js');
const Thread = require('../../engine/thread.js');
const MathUtil = require('../../util/math-util.js');
const uid = require('../../util/uid.js');
const Cast = require('../../util/cast');

/**
 * Icon svg to be displayed at the left edge of each extension block, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
// const blockIconURI = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI1MTJweCIgaGVpZ2h0PSI1MTJweCIgdmlld0JveD0iMCAwIDUxMiA1MTIiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDUxMiA1MTI7IiB4bWw6c3BhY2U9InByZXNlcnZlIj48Zz48cGF0aCBkPSJNMzAzLjcsMTI4aC0yMjFDNjMuOSwxMjgsNDcsMTQyLjEsNDcsMTYwLjd2MTg3LjljMCwxOC42LDE2LjksMzUuNCwzNS43LDM1LjRoMjIxYzE4LjgsMCwzMy4zLTE2LjgsMzMuMy0zNS40VjE2MC43QzMzNywxNDIuMSwzMjIuNSwxMjgsMzAzLjcsMTI4eiIvPjxwYXRoIGQ9Ik0zNjcsMjEzdjg1LjZsOTgsNTMuNFYxNjBMMzY3LDIxM3oiLz48L2c+PC9zdmc+';

const VideoDirections = {
    FORWARD: 'forward',
    REVERSE: 'reverse'
};

const VideoEffects = {
    COLOR:        'color',
    WHIRL:        'whirl',
    CRYSTALLIZE:  'crystallize',
    KALEIDOSCOPE: 'kaleidoscope'
};

const TiltDirections = {
    LEFT:     'left',
    RIGHT:    'right',
    FORWARD:  'forward',
    BACKWARD: 'backward',
    // ANY: 'any'
};

const CardinalDirections = {
    NORTH: 'north',
    SOUTH: 'south',
    EAST:  'east',
    WEST:  'west'
}

const TILT_THRESHOLD = 15.0;
const COMPASS_THRESHOLD = 20.0; // 10 degrees on either side

/**
 * Host for the video and audio-related blocks in Steina
 * @param {Runtime} runtime - the runtime instantiating this block package.
 * @constructor
 */
class SteinaBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        if (this.runtime) {
            this.runtime.on('PROJECT_STOP_ALL', () => {
                this.runtime.videoState.playing = {};
                this.runtime.audioState.playing = {};
                this.runtime.targets.forEach(t => {
                    if (t.hasOwnProperty("nonblockingSoundsAvailable")) {
                        t.nonblockingSoundsAvailable = AudioTarget.MAX_SIMULTANEOUS_NONBLOCKING_SOUNDS;
                    }
                })
            });
        }
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        return {
            id: 'steina',
            name: 'Steina',
            // blockIconURI: blockIconURI,
            blocks: [
                // Video
                {
                    opcode: 'playEntireVideoUntilDone',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'steina.video.playEntireVideoUntilDone',
                        default: 'play from start to end',
                        description: 'plays the entire video at current playback rate from the first frame ' +
                                     'until reaching the last frame'
                    })
                },
                {
                    opcode: 'playVideoFromAToB',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'steina.video.playVideoFromAToB',
                        default: 'play from [MARKER_A] to [MARKER_B]',
                        description: 'plays the video at current playback rate from the first marker argument ' +
                                     'until the second marker argument'
                    }),
                    arguments: {
                        MARKER_A: {
                            type: ArgumentType.STRING,
                            menu: 'markers',
                            defaultValue: 'start'
                        },
                        MARKER_B: {
                            type: ArgumentType.STRING,
                            menu: 'markers',
                            defaultValue: 'end'
                        }
                    }
                },
                {
                    opcode: 'playForwardReverseUntilDone',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'steina.video.playForwardReverseUntilDone',
                        default: 'play [DIRECTION]',
                        description: 'plays the video at current playback rate from the current frame ' +
                                     'until reaching either the final frame (forward) or the first frame (reverse) ' +
                                     'while blocking the execution thread'
                    }),
                    arguments: {
                        DIRECTION: {
                            type: ArgumentType.STRING,
                            menu: 'directions',
                            defaultValue: VideoDirections.FORWARD
                        }
                    }
                },
                {
                    opcode: 'startPlayingForwardReverse',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'steina.video.startPlayingForwardReverse',
                        default: 'start playing [DIRECTION]',
                        description: 'plays the video at current playback rate from the current frame ' +
                                     'until reaching either the final frame (forward) or the first frame (reverse)'
                    }),
                    arguments: {
                        DIRECTION: {
                            type: ArgumentType.STRING,
                            menu: 'directions',
                            defaultValue: VideoDirections.FORWARD
                        }
                    }
                },
                {
                    opcode: 'startPlaying',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'steina.video.startPlaying',
                        default: 'start playing video',
                        description: 'plays the video at the current rate wihtout blocking the thread ' +
                                     'until reaching the end'
                    })
                },
                {
                    opcode: 'stopPlaying',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'steina.video.stopPlaying',
                        default: 'stop playing',
                        description: 'stops the video at the current frame, if necessary'
                    })
                },
                {
                    opcode: 'goToFrame',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'steina.video.goToFrame',
                        default: 'jump to frame [FRAME]',
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
                        id: 'steina.video.playNFrames',
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
                        id: 'steina.video.playForwardUntilDone',
                        default: 'play forward until done',
                        description: 'plays the video at the absolute value of the playback rate ' +
                                     'from the current frame until reaching the last frame'
                    })
                },
                {
                    opcode: 'playBackwardUntilDone',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'steina.video.playBackwardUntilDone',
                        default: 'play backward until done',
                        description: 'plays the video at the negative absolute value of the playback rate ' +
                                     'from the current frame until reaching the first frame'
                    })
                },
                {
                    opcode: 'nextFrame',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'steina.video.nextFrame',
                        default: 'go to next frame',
                        description: 'increments the current video frame'
                    })
                },
                {
                    opcode: 'previousFrame',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'steina.video.previousFrame',
                        default: 'go to previous frame',
                        description: 'decrements the current video frame'
                    })
                },
                {
                    opcode: 'changeEffectBy',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'steina.video.changeEffectBy',
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
                        id: 'steina.video.setEffectTo',
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
                        id: 'steina.video.clearVideoEffects',
                        default: 'clear video effects',
                        description: 'reset video effects state to the default'
                    })
                },
                {
                    opcode: 'whenReached',
                    blockType: BlockType.HAT,
                    text: formatMessage({
                        id: 'steina.video.whenReached',
                        default: 'when I reach [MARKER]',
                        description: 'triggers when the video is playing and passes/reaches the specified marker or start/end point'
                    }),
                    arguments: {
                        MARKER: {
                            type: ArgumentType.STRING,
                            menu: 'markers'
                        }
                    }
                },
                {
                    opcode: 'whenPlayedToEnd',
                    text: formatMessage({
                        id: 'steina.video.whenPlayedToEnd',
                        default: 'when played to end',
                        description: 'triggers when the video is playing and reaches the final frame'
                    }),
                    blockType: BlockType.HAT
                },
                {
                    opcode: 'whenPlayedToBeginning',
                    text: formatMessage({
                        id: 'steina.video.whenPlayedToBeginning',
                        default: 'when played to beginning',
                        description: 'triggers when the video is playing and reaches the first frame (for example, when playing in reverse)'
                    }),
                    blockType: BlockType.HAT
                },
                {
                    opcode: 'whenTapped',
                    text: formatMessage({
                        id: 'steina.video.whenTapped',
                        default: 'when tapped',
                        description: 'triggers when the video is tapped by the user'
                    }),
                    blockType: BlockType.HAT
                },
                {
                    opcode: 'getCurrentFrame',
                    text: formatMessage({
                        id: 'steina.video.getCurrentFrame',
                        default: 'current frame',
                        description: 'reports the current frame of the video'
                    }),
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'getTotalFrames',
                    text: formatMessage({
                        id: 'steina.video.getTotalFrames',
                        default: 'total frames',
                        description: 'reports the length of the video in frames'
                    }),
                    blockType: BlockType.REPORTER
                },

                {
                    opcode: 'isTapped',
                    text: formatMessage({
                        id: 'steina.video.isTapped',
                        default: 'tapped?',
                        description: 'reports if the user is current touching the video or not'
                    }),
                    blockType: BlockType.BOOLEAN
                },

                // Audio
                {
                    opcode: 'startSound',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'steina.audio.startSound',
                        default: 'start sound',
                        description: 'plays the entire sound without blocking'
                    })
                },
                {
                    opcode: 'playSound',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'steina.audio.playSound',
                        default: 'play sound until done',
                        description: 'plays the entire sound while blocking execution'
                    })
                },
                {
                    opcode: 'startSoundFromAToB',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'steina.audio.startSoundFromAToB',
                        default: 'start sound from [MARKER_A] to [MARKER_B]',
                        description: 'plays the sound between two markers without blocking'
                    }),
                    arguments: {
                        MARKER_A: {
                            type: ArgumentType.STRING,
                            menu: 'markers'
                        },
                        MARKER_B: {
                            type: ArgumentType.STRING,
                            menu: 'markers'
                        }
                    }
                },
                {
                    opcode: 'playSoundFromAToB',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'steina.audio.playSoundFromAToB',
                        default: 'play sound from [MARKER_A] to [MARKER_B] until done',
                        description: 'plays the sound between two markers while blocking execution'
                    }),
                    arguments: {
                        MARKER_A: {
                            type: ArgumentType.STRING,
                            menu: 'markers'
                        },
                        MARKER_B: {
                            type: ArgumentType.STRING,
                            menu: 'markers'
                        }
                    }
                },
                {
                    opcode: 'setVolumeTo',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'steina.video.setVolumeTo',
                        default: 'set volume to [VALUE]',
                        description: 'sets the volume to the given value, clamping between 0 and 500'
                    }),
                    arguments: {
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100
                        }
                    }
                },
                {
                    opcode: 'changeVolumeBy',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'steina.video.changeVolumeBy',
                        default: 'change volume by [VALUE]',
                        description: 'changes the volume by the given value, clamping between 0 and 500'
                    }),
                    arguments: {
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 10
                        }
                    }
                },
                {
                    opcode: 'getVolume',
                    text: formatMessage({
                        id: 'steina.audio.getVolume',
                        default: 'volume',
                        description: 'reports the current volume of the audio clip'
                    }),
                    blockType: BlockType.REPORTER
                },

                // Shared Audio and Video
                {
                    opcode: 'setPlayRate',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'steina.video.setPlayRate',
                        default: 'set play rate to [RATE] %',
                        description: 'sets the playback rate of the asset as a percentage'
                    }),
                    arguments: {
                        RATE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100
                        }
                    }
                },
                {
                    opcode: 'changePlayRateBy',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'steina.video.changeRateBy',
                        default: 'change play rate by [RATE]',
                        description: 'changes the playback rate by the given value, clamping between 0 and 1000'
                    }),
                    arguments: {
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 10
                        }
                    }
                },
                {
                    opcode: 'getPlayRate',
                    text: formatMessage({
                        id: 'steina.audio.getPlayRate',
                        default: 'play rate',
                        description: 'reports the current play rate of the audio clip'
                    }),
                    blockType: BlockType.REPORTER
                },

                // Motion
                {
                    opcode: 'whenTilted',
                    text: formatMessage({
                        id: 'steina.motion.whenTilted',
                        default: 'when tilted [DIRECTION]',
                        description: 'when the device is tilted in a direction'
                    }),
                    blockType: BlockType.HAT,
                    arguments: {
                        DIRECTION: {
                            type: ArgumentType.STRING,
                            menu: 'tiltDirection',
                            defaultValue: TiltDirections.RIGHT
                        }
                    }
                },
                {
                    opcode: 'isTilted',
                    text: formatMessage({
                        id: 'steina.motion.isTilted',
                        default: 'tilted [DIRECTION]?',
                        description: 'is the device is tilted in a direction?'
                    }),
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        DIRECTION: {
                            type: ArgumentType.STRING,
                            menu: 'tiltDirection',
                            defaultValue: TiltDirections.RIGHT
                        }
                    }
                },
                {
                    opcode: 'getTiltAngle',
                    text: formatMessage({
                        id: 'steina.motion.tiltAngle',
                        default: 'tilt angle [DIRECTION]',
                        description: 'how much the device is tilted in a direction'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        DIRECTION: {
                            type: ArgumentType.STRING,
                            menu: 'tiltDirection',
                            defaultValue: TiltDirections.RIGHT
                        }
                    }
                },
                {
                    opcode: 'whenPointed',
                    text: formatMessage({
                        id: 'steina.motion.whenPointed',
                        default: 'when pointed toward [DIRECTION]',
                        description: 'when the device is rotated toward a cardinal direction'
                    }),
                    blockType: BlockType.HAT,
                    arguments: {
                        DIRECTION: {
                            type: ArgumentType.STRING,
                            menu: 'cardinalDirections',
                            defaultValue: CardinalDirections.NORTH
                        }
                    }
                },
                {
                    opcode: 'isPointed',
                    text: formatMessage({
                        id: 'steina.motion.isPointed',
                        default: 'pointed [DIRECTION]?',
                        description: 'is the device is pointed toward a cardinal direction?'
                    }),
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        DIRECTION: {
                            type: ArgumentType.STRING,
                            menu: 'cardinalDirections',
                            defaultValue: CardinalDirections.NORTH
                        }
                    }
                },
                {
                    opcode: 'getCompassAngle',
                    text: formatMessage({
                        id: 'steina.motion.compassAngle',
                        default: 'compass angle',
                        description: 'compass angle where 0.0 means north and 90.0 means east'
                    }),
                    blockType: BlockType.REPORTER
                },
            ],
            menus: {
                directions: [
                    {
                        text: formatMessage({
                            id: 'steina.video.videoDirectionMenu.forward',
                            default: 'forward',
                            description: 'label for playing a video in the forward direction'
                        }),
                        value: VideoDirections.FORWARD
                    },
                    {
                        text: formatMessage({
                            id: 'steina.video.videoDirectionMenu.reverse',
                            default: 'in reverse',
                            description: 'label for playing a video in the reverse direction'
                        }),
                        value: VideoDirections.REVERSE
                    }
                ],
                effects: [
                    {
                        text: formatMessage({
                            id: 'steina.video.effectsMenu.color',
                            default: 'color',
                            description: 'label for color element in effects picker for video extension'
                        }),
                        value: VideoEffects.COLOR
                    },
                    {
                        text: formatMessage({
                            id: 'steina.video.effectsMenu.whirl',
                            default: 'whirl',
                            description: 'label for whirl element in effects picker for video extension'
                        }),
                        value: VideoEffects.WHIRL
                    },
                    {
                        text: formatMessage({
                            id: 'steina.video.effectsMenu.brightness',
                            default: 'brightness',
                            description: 'label for brightness element in effects picker for video extension'
                        }),
                        value: VideoEffects.BRIGHTNESS
                    },
                    {
                        text: formatMessage({
                            id: 'steina.video.effectsMenu.ghost',
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
                ],
                tiltDirections: [
                    {
                        text: formatMessage({
                            id: 'steina.tiltDirectionMenu.right',
                            default: 'right',
                            description: 'label for right element in tilt direction picker'
                        }),
                        value: TiltDirections.RIGHT
                    },
                    {
                        text: formatMessage({
                            id: 'steina.tiltDirectionMenu.left',
                            default: 'left',
                            description: 'label for left element in tilt direction picker'
                        }),
                        value: TiltDirections.LEFT
                    },
                    {
                        text: formatMessage({
                            id: 'steina.tiltDirectionMenu.front',
                            default: 'forward',
                            description: 'label for forward element in tilt direction picker'
                        }),
                        value: TiltDirections.FORWARD
                    },
                    {
                        text: formatMessage({
                            id: 'steina.tiltDirectionMenu.back',
                            default: 'backward',
                            description: 'label for backward element in tilt direction picker'
                        }),
                        value: TiltDirections.BACKWARD
                    }
                ],
                cardinalDirections: [
                    {
                        text: formatMessage({
                            id: 'steina.cardinalDirectionMenu.north',
                            default: 'north',
                            description: 'label for north element in cardinal direction picker'
                        }),
                        value: CardinalDirections.NORTH
                    },
                    {
                        text: formatMessage({
                            id: 'steina.cardinalDirectionMenu.east',
                            default: 'east',
                            description: 'label for east element in cardinal direction picker'
                        }),
                        value: CardinalDirections.EAST
                    },
                    {
                        text: formatMessage({
                            id: 'steina.cardinalDirectionMenu.south',
                            default: 'south',
                            description: 'label for south element in cardinal direction picker'
                        }),
                        value: CardinalDirections.SOUTH
                    },
                    {
                        text: formatMessage({
                            id: 'steina.cardinalDirectionMenu.back',
                            default: 'west',
                            description: 'label for west element in cardinal direction picker'
                        }),
                        value: CardinalDirections.WEST
                    }
                ],
                markers: '_buildMarkersMenu'
            }
        };
    }

    _buildMarkersMenu(targetId) {
        if (!targetId) {
            return [
                {
                    text: 'n/a',
                    value: '0'
                }
            ]
        }

        var target = this.runtime.getTargetById(targetId);
        if (target && target.hasOwnProperty('markers')) {
            var markers = target.markers;
            var menuItems = [
                {
                    text: formatMessage({
                        id: 'steina.markersMenu.start',
                        default: 'start',
                        description: 'label for the start of the video or audio clip'
                    }),
                    value: target.trimStart.toString()
                }
            ];

            for (var i = 0; i < markers.length; ++i) {
                var marker = markers[i];
                menuItems.push({
                    text: (i + 1).toString(),
                    value: marker.toString()
                })
            }

            menuItems.push({
                text: formatMessage({
                        id: 'steina.markersMenu.end',
                        default: 'end',
                        description: 'label for the end of the video or audio clip'
                    }),
                value: target.trimEnd.toString()
            });

            return menuItems;
        }

        return [
            {
                text: 'n/a',
                value: '0'
            }
        ]
    }

    // Video

    _queueVideo(runtime, thread, videoTarget, start, end, blocking) {
        var id = uid();
        var playingVideo = {
            id: id,
            start: start,
            end: end,
            threadTopBlock: thread.topBlock,
            blocking: blocking
        };

        // @NOTE(sean): This will overwrite any existing playing video for this target
        runtime.videoState.playing[videoTarget.id] = playingVideo;

        return id;
    }

    playEntireVideoUntilDone(args, util) {
        var target = util.target;
        var thread = util.thread;

        if (!util.stackFrame.playingId) {
            target.currentFrame = target.trimStart;
            var playingId = this._queueVideo(util.runtime, thread, target, target.trimStart, target.trimEnd, true);
            util.stackFrame.playingId = playingId;
        }
        else {
            var playingId = util.stackFrame.playingId;
            var playingVideo = util.runtime.videoState.playing[target.id];
            if (!playingVideo || playingVideo.id != playingId) {
                // Either the video ended playing on the last frame
                // Or another playing video overwrote it since the last frame
                return;
            }
        }
        thread.status = Thread.STATUS_YIELD_TICK;
    }

    playVideoFromAToB(args, util) {
        var target = util.target;
        var thread = util.thread;

        var start = +(args.MARKER_A);
        var end = +(args.MARKER_B);

        if (!util.stackFrame.playingId) {
            target.currentFrame = start;
            var playingId = this._queueVideo(util.runtime, thread, target, start, end, true);
            util.stackFrame.playingId = playingId;
        }
        else {
            var playingId = util.stackFrame.playingId;
            var playingVideo = util.runtime.videoState.playing[target.id];
            if (!playingVideo || playingVideo.id != playingId) {
                // Either the video ended playing on the last frame
                // Or another playing video overwrote it since the last frame
                return;
            }
        }
        thread.status = Thread.STATUS_YIELD_TICK;
    }

    playForwardReverseUntilDone(args, util) {
        var target = util.target;
        var thread = util.thread;

        if (!util.stackFrame.playingId) {
            var direction = args.DIRECTION;
            if (direction == VideoDirections.FORWARD) {
                var playingId = this._queueVideo(util.runtime, thread, target, target.currentFrame, target.trimEnd, true);
                util.stackFrame.playingId = playingId;
            }
            else {
                var playingId = this._queueVideo(util.runtime, thread, target, target.currentFrame, target.trimStart, true);
                util.stackFrame.playingId = playingId;
            }
        }
        else {
            var playingId = util.stackFrame.playingId;
            var playingVideo = util.runtime.videoState.playing[target.id];
            if (!playingVideo || playingVideo.id != playingId) {
                // Either the video ended playing on the last frame
                // Or another playing video overwrote it since the last frame
                return;
            }
        }
        thread.status = Thread.STATUS_YIELD_TICK;
    }

    startPlayingForwardReverse(args, util) {
        var target = util.target;
        var thread = util.thread;

        var direction = args.DIRECTION;
        if (direction == VideoDirections.FORWARD) {
            this._queueVideo(util.runtime, thread, target, target.currentFrame, target.trimEnd, false);
        }
        else {
            this._queueVideo(util.runtime, thread, target, target.currentFrame, target.trimStart, false);
        }
    }

    setPlayRate(args, util) {
        util.target.setRate(+(args.RATE));
    }

    changePlayRateBy(args, util) {
        var target = util.target;
        target.setRate(+(target.playbackRate) + +(args.RATE));
    }

    startPlaying(args, util) {
        var target = util.target;
        var thread = util.thread;
        this._queueVideo(util.runtime, thread, target, target.currentFrame, target.trimEnd, false);
    }

    stopPlaying(args, util) {
        var target = util.target;
        if (target.id in util.runtime.videoState.playing) {
            delete util.runtime.videoState.playing[target.id];
        }
    }

    goToFrame(args, util) {
        // Frames are 1-indexed in the blocks, but 0-indexed in the target
        var target = util.target;
        target.setCurrentFrame((+(args.FRAME) + target.trimStart) - 1);
    }

    playNFrames(args, util) {
        var target = util.target;
        var thread = util.thread;

        if (!util.stackFrame.playingId) {
            var framesToPlay = +(args.FRAMES);
            var endFrame = MathUtil.clamp(target.currentFrame + framesToPlay, target.trimStart, target.trimEnd);
            var playingId = this._queueVideo(util.runtime, thread, target, target.currentFrame, endFrame, true);
            util.stackFrame.playingId = playingId;
        }
        else {
            var playingId = util.stackFrame.playingId;
            var playingVideo = util.runtime.videoState.playing[target.id];
            if (!playingVideo || playingVideo.id != playingId) {
                // Either the video ended playing on the last frame
                // Or another playing video overwrote it since the last frame
                return;
            }
        }
        thread.status = Thread.STATUS_YIELD_TICK;
    }

    playForwardUntilDone(args, util) {
        var target = util.target;
        var thread = util.thread;

        if (!util.stackFrame.playingId) {
            var playingId = this._queueVideo(util.runtime, thread, target, target.currentFrame, target.trimEnd, true);
            util.stackFrame.playingId = playingId;
        }
        else {
            var playingId = util.stackFrame.playingId;
            var playingVideo = util.runtime.videoState.playing[target.id];
            if (!playingVideo || playingVideo.id != playingId) {
                // Either the video ended playing on the last frame
                // Or another playing video overwrote it since the last frame
                return;
            }
        }
        thread.status = Thread.STATUS_YIELD_TICK;
    }

    playBackwardUntilDone(args, util) {
        var target = util.target;
        var thread = util.thread;

        if (!util.stackFrame.playingId) {
            var playingId = this._queueVideo(util.runtime, thread, target, target.currentFrame, target.trimStart, true);
            util.stackFrame.playingId = playingId;
        }
        else {
            var playingId = util.stackFrame.playingId;
            var playingVideo = util.runtime.videoState.playing[target.id];
            if (!playingVideo || playingVideo.id != playingId) {
                // Either the video ended playing on the last frame
                // Or another playing video overwrote it since the last frame
                return;
            }
        }
        thread.status = Thread.STATUS_YIELD_TICK;
    }

    nextFrame(args, util) {
        var target = util.target;
        target.setCurrentFrame(target.currentFrame + 1);
    }

    previousFrame(args, util) {
        var target = util.target;
        target.setCurrentFrame(target.currentFrame - 1);
    }

    isTapped(args, util) {
        var target = util.target;
        return target.tapped;
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
        if (target.currentFrame == target.trimEnd) {
            return true;
        }
        return false;
    }

    whenPlayedToBeginning(args, util) {
        var target = util.target;
        if (target.currentFrame == target.trimStart) {
            return true;
        }
        return false;
    }

    whenReached(args, util) {
        var target = util.target;
        var marker = args.MARKER;

        return marker == target.currentFrame;
    }

    whenTapped(args, util) {
        var target = util.target;
        return target.tapped;
    }

    getCurrentFrame(args, util) {
        // @TODO: Should this return an integer or a float? We're going with integer for now
        var target = util.target;
        return +(target.currentFrame - target.trimStart) + 1; // 1-indexed
    }

    getTotalFrames(args, util) {
        var target = util.target
        return target.trimEnd - target.trimStart;
    }

    getPlayRate(args, util) {
        return util.target.playbackRate;
    }

    // Audio
    startSound(args, util) {
        var target = util.target;

        // Only start a sound if we're below the limit of simultaneous
        // unblocking sounds
        if (target.nonblockingSoundsAvailable > 0) {
            // Just queue the sound and don't yield the thread
            this._queueSound(util.runtime, target, target.trimStart, target.trimEnd, target.playbackRate, false);
            target.nonblockingSoundsAvailable--;
        }
    }

    playSound(args, util) {
        var target = util.target;
        var thread = util.thread;

        if (!util.stackFrame.playingId) {
            // Add the new sound to the play queue
            var id = this._queueSound(util.runtime, target, target.trimStart, target.trimEnd, target.playbackRate);

            util.stackFrame.playingId = id;
        }
        else {
            var playingId = util.stackFrame.playingId;
            if (!util.runtime.audioState.playing[playingId]) {
                // The sound finished on the last frame
                // and was removed by the runtime, so we're done
                return;
            }
        }
        thread.status = Thread.STATUS_YIELD_TICK;
    }

    startSoundFromAToB(args, util) {
        var target = util.target;

        var start = +(args.MARKER_A);
        var end = +(args.MARKER_B);

        if (target.nonblockingSoundsAvailable > 0) {
            // Just queue the sound and don't yield the thread
            this._queueSound(util.runtime, target, start, end, target.playbackRate, false);
            target.nonblockingSoundsAvailable--;
        }
    }

    playSoundFromAToB(args, util) {
        var target = util.target;
        var thread = util.thread;

        var start = +(args.MARKER_A);
        var end = +(args.MARKER_B);

        if (!util.stackFrame.playingId) {
            // Add the new sound to the play queue
            var id = this._queueSound(util.runtime, target, start, end, target.playbackRate);

            util.stackFrame.playingId = id;
        }
        else {
            var playingId = util.stackFrame.playingId;
            if (!util.runtime.audioState.playing[playingId]) {
                // The sound finished on the last frame
                // and was removed by the runtime, so we're done
                return;
            }
        }
        thread.status = Thread.STATUS_YIELD_TICK;
    }

    setVolumeTo(args, util) {
        util.target.setVolume(args.VALUE)
    }

    changeVolumeBy(args, util) {
        var target = util.target;
        target.setVolume(+(target.volume) + +(args.VALUE));
    }

    getVolume(args, util) {
        return util.target.volume;
    }

    _queueSound(runtime, audioTarget, start, end, playbackRate, blocking = true) {
        var id = uid();
        var firstSample = Math.max(start, 0);
        var lastSample = Math.min(end, audioTarget.totalSamples - 1);
        var playingSound = {
            audioTargetId : audioTarget.id,
            sampleRate: audioTarget.sampleRate,
            start: firstSample,
            end: lastSample,
            playbackRate: playbackRate,
            prevPlayhead: firstSample,
            playhead: firstSample,
            blocking: blocking
        };
        runtime.audioState.playing[id] = playingSound;

        return id;
    }

    // Motion
    getTiltAngle(args, util) {
        return this._getTiltAngle(args.DIRECTION);
    }

    whenTilted(args, util) {
        return this._isTilted(args.DIRECTION);
    }

    isTilted(args, util) {
        return this._isTilted(args.DIRECTION);
    }

    _getTiltAngle(direction) {
        if (direction == TiltDirections.FORWARD) {
            return this.runtime.motion.pitch;
        }
        else if (direction == TiltDirections.BACKWARD) {
            return -this.runtime.motion.pitch;
        }
        else if (direction == TiltDirections.LEFT) {
            return -this.runtime.motion.roll;
        }
        else if (direction == TiltDirections.RIGHT) {
            return this.runtime.motion.roll;
        }
    }

    _isTilted(direction) {
        return this._getTiltAngle(direction) >= TILT_THRESHOLD;
    }

    getCompassAngle(args, util) {
        return util.runtime.motion.heading;
    }

    whenPointed(args, util) {
        return this._isPointed(args.DIRECTION);
    }

    isPointed(args, util) {
        return this._isPointed(args.DIRECTION);
    }

    _isPointed(direction) {
        var compass = this.runtime.motion.heading;
        if (direction == CardinalDirections.NORTH) {
            return compass <= (COMPASS_THRESHOLD / 2.0) ||
                   compass >= 360.0 - (COMPASS_THRESHOLD / 2.0);
        }
        else if (direction == CardinalDirections.SOUTH) {
            return Math.abs(compass - 180.0) <= COMPASS_THRESHOLD;
        }
        else if (direction == CardinalDirections.EAST) {
            return Math.abs(compass - 90.0) <= COMPASS_THRESHOLD;
        }
        else if (direction == CardinalDirections.WEST) {
            return Math.abs(compass - 270.0) <= COMPASS_THRESHOLD;
        }
    }

}

module.exports = SteinaBlocks;
