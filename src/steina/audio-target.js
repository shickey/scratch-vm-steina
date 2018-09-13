const log = require('../util/log');
const Target = require('../engine/target');
const MathUtil = require('../util/math-util');

/**
 * Audio target: runtime object representing the state of an audio object
 * 
 */
class AudioTarget extends Target {

  constructor(runtime, id, markers) {
    super(runtime, null);

    // Overwrite the id to match the id in Core Data
    if (id) {
      this.id = id;
    }

    // Variables from RenderedTarget
    this.volume = 100;

    // Audio specific state
    this.markers = []

    if (!!markers) {
      this.markers = markers;
    }
  }

  setVolume (vol) {
    this.volume = MathUtil.clamp(vol, 0, 500);
  }

  toJSON () {
    return {
      id: this.id,
      volume: this.volume,
      blocks: {
        _blocks: this.blocks._blocks,
        _scripts: this.blocks._scripts,
      },
      variables: this.variables,
      lists: this.lists,

      markers: this.markers
    }
  }

}

module.exports = AudioTarget;
