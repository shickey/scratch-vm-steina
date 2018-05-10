const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const formatMessage = require('format-message');
const log = require('../../util/log');

/**
 * Icon svg to be displayed at the left edge of each extension block, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const blockIconURI = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+cGVuLWljb248L3RpdGxlPjxnIHN0cm9rZT0iIzU3NUU3NSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik04Ljc1MyAzNC42MDJsLTQuMjUgMS43OCAxLjc4My00LjIzN2MxLjIxOC0yLjg5MiAyLjkwNy01LjQyMyA1LjAzLTcuNTM4TDMxLjA2NiA0LjkzYy44NDYtLjg0MiAyLjY1LS40MSA0LjAzMi45NjcgMS4zOCAxLjM3NSAxLjgxNiAzLjE3My45NyA0LjAxNUwxNi4zMTggMjkuNTljLTIuMTIzIDIuMTE2LTQuNjY0IDMuOC03LjU2NSA1LjAxMiIgZmlsbD0iI0ZGRiIvPjxwYXRoIGQ9Ik0yOS40MSA2LjExcy00LjQ1LTIuMzc4LTguMjAyIDUuNzcyYy0xLjczNCAzLjc2Ni00LjM1IDEuNTQ2LTQuMzUgMS41NDYiLz48cGF0aCBkPSJNMzYuNDIgOC44MjVjMCAuNDYzLS4xNC44NzMtLjQzMiAxLjE2NGwtOS4zMzUgOS4zYy4yODItLjI5LjQxLS42NjguNDEtMS4xMiAwLS44NzQtLjUwNy0xLjk2My0xLjQwNi0yLjg2OC0xLjM2Mi0xLjM1OC0zLjE0Ny0xLjgtNC4wMDItLjk5TDMwLjk5IDUuMDFjLjg0NC0uODQgMi42NS0uNDEgNC4wMzUuOTYuODk4LjkwNCAxLjM5NiAxLjk4MiAxLjM5NiAyLjg1NU0xMC41MTUgMzMuNzc0Yy0uNTczLjMwMi0xLjE1Ny41Ny0xLjc2NC44M0w0LjUgMzYuMzgybDEuNzg2LTQuMjM1Yy4yNTgtLjYwNC41My0xLjE4Ni44MzMtMS43NTcuNjkuMTgzIDEuNDQ4LjYyNSAyLjEwOCAxLjI4Mi42Ni42NTggMS4xMDIgMS40MTIgMS4yODcgMi4xMDIiIGZpbGw9IiM0Qzk3RkYiLz48cGF0aCBkPSJNMzYuNDk4IDguNzQ4YzAgLjQ2NC0uMTQuODc0LS40MzMgMS4xNjVsLTE5Ljc0MiAxOS42OGMtMi4xMyAyLjExLTQuNjczIDMuNzkzLTcuNTcyIDUuMDFMNC41IDM2LjM4bC45NzQtMi4zMTYgMS45MjUtLjgwOGMyLjg5OC0xLjIxOCA1LjQ0LTIuOSA3LjU3LTUuMDFsMTkuNzQzLTE5LjY4Yy4yOTItLjI5Mi40MzItLjcwMi40MzItMS4xNjUgMC0uNjQ2LS4yNy0xLjQtLjc4LTIuMTIyLjI1LjE3Mi41LjM3Ny43MzcuNjE0Ljg5OC45MDUgMS4zOTYgMS45ODMgMS4zOTYgMi44NTYiIGZpbGw9IiM1NzVFNzUiIG9wYWNpdHk9Ii4xNSIvPjxwYXRoIGQ9Ik0xOC40NSAxMi44M2MwIC41LS40MDQuOTA1LS45MDQuOTA1cy0uOTA1LS40MDUtLjkwNS0uOTA0YzAtLjUuNDA3LS45MDMuOTA2LS45MDMuNSAwIC45MDQuNDA0LjkwNC45MDR6IiBmaWxsPSIjNTc1RTc1Ii8+PC9nPjwvc3ZnPg==';

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
     * The default pen state, to be used when a target has no existing pen state.
     * @type {PenState}
     */
    // static get DEFAULT_PEN_STATE () {
    //     return {
    //         penDown: false,
    //         color: 66.66,
    //         saturation: 100,
    //         brightness: 100,
    //         transparency: 0,
    //         _shade: 50, // Used only for legacy `change shade by` blocks
    //         penAttributes: {
    //             color4f: [0, 0, 1, 1],
    //             diameter: 1
    //         }
    //     };
    // }

    /**
     * Initialize color parameters menu with localized strings
     * @returns {array} of the localized text and values for each menu element
     * @private
     */
    // _initColorParam () {
    //     return [
    //         {
    //             text: formatMessage({
    //                 id: 'pen.colorMenu.color',
    //                 default: 'color',
    //                 description: 'label for color element in color picker for pen extension'
    //             }),
    //             value: ColorParam.COLOR
    //         },
    //         {
    //             text: formatMessage({
    //                 id: 'pen.colorMenu.saturation',
    //                 default: 'saturation',
    //                 description: 'label for saturation element in color picker for pen extension'
    //             }),
    //             value: ColorParam.SATURATION
    //         },
    //         {
    //             text: formatMessage({
    //                 id: 'pen.colorMenu.brightness',
    //                 default: 'brightness',
    //                 description: 'label for brightness element in color picker for pen extension'
    //             }),
    //             value: ColorParam.BRIGHTNESS
    //         },
    //         {
    //             text: formatMessage({
    //                 id: 'pen.colorMenu.transparency',
    //                 default: 'transparency',
    //                 description: 'label for transparency element in color picker for pen extension'
    //             }),
    //             value: ColorParam.TRANSPARENCY

    //         }
    //     ];
    // }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        return {
            id: 'video',
            name: 'Video',
            blockIconURI: blockIconURI,
            blocks: [
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
                
            }
        };
    }
    
    clearVideoEffects() {
        console.log('hello steina!');
    }

}

module.exports = SteinaVideoBlocks;
