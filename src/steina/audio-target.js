const log = require('../util/log');
const Target = require('../engine/target');
const MathUtil = require('../util/math-util');

/**
 * Audio target: runtime object representing the state of an audio object
 * 
 */
class AudioTarget extends Target {

  static get MAX_SIMULTANEOUS_NONBLOCKING_SOUNDS () {
        return 25;
    }

  constructor(runtime, id, audioInfo) {
    super(runtime, null);

    // Overwrite the id to match the id in Core Data
    this.id = id;

    // Variables from RenderedTarget
    this.volume = 100;

    // Audio specific state
    this.totalSamples = 0;
    this.sampleRate = 48000;
    this.markers = [];
    this.nonblockingSoundsAvailable = AudioTarget.MAX_SIMULTANEOUS_NONBLOCKING_SOUNDS;

    if (!!audioInfo) {
      this.totalSamples = audioInfo.totalSamples || 0;
      this.sampleRate = audioInfo.sampleRate || 48000;
      this.markers = audioInfo.markers || [];
    }
  }

  setVolume (vol) {
    this.volume = MathUtil.clamp(vol, 0, 500);
  }

  toJSON () {
    return {
      id: this.id,
      volume: this.volume,
      totalSamples: this.totalSamples,
      sampleRate: this.sampleRate,
      blocks: {
        _blocks: this.blocks._blocks,
        _scripts: this.blocks._scripts,
      },
      variables: this.variables,
      lists: this.lists,

      markers: this.markers
    }
  }

  duplicate () {
    var newTarget = new AudioTarget(this.runtime); // We purposefully don't provide an id here and
                                                   // instead overwrite it after duplication so that
                                                   // this method matches the signature of the standard
                                                   // sprite duplication method

    newTarget.volume = this.volume;

    // Audio specific state
    newTarget.totalSamples = this.totalSamples;
    newTarget.sampleRate = this.sampleRate;
    newTarget.markers = JSON.parse(JSON.stringify(this.markers))

    // Copy blocks, vars, etc.
    newTarget.blocks = this.blocks.duplicate();
    newTarget.variables = JSON.parse(JSON.stringify(this.variables));
    newTarget.lists = JSON.parse(JSON.stringify(this.lists));

    return newTarget;
  }

}

module.exports = AudioTarget;
