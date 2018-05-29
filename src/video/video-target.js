const Target = require('../engine/target');
const MathUtil = require('../util/math-util');

/**
 * Video target: run object representing the state of a video object
 * 
 * This declares several of the variables and functions of RenderedTarget
 * allowing us to use many of the motion and looks block out the box
 */
class VideoTarget extends Target {

  constructor(runtime, id, videoInfo) {
    super(runtime, null);

    // Overwrite the id to match the id in Core Data
    if (id) {
      this.id = id;
    }

    // Variables from RenderedTarget
    this.x = 0;
    this.y = 0;
    this.direction = 90;
    this.visible = true;
    this.size = 100;

    // Video specific variables
    this.fps = videoInfo.fps || 30.0;
    this.frames = videoInfo.frames || 0;
    this.currentTime = 0.0;
    this.playbackRate = 100;
  }

  // Functions from RenderedTarget
  setXY (x, y, force) {
    this.x = x;
    this.y = y;
  }

  setDirection (direction) {
    this.direction = MathUtil.wrapClamp(direction, -179, 180);
  }

  setVisible (visible) {
    this.visible = !!visible;
  }
  
  setSize (size) {
    this.size = MathUtil.clamp(size, 1, 500);
  }

  // Video functions
  setRate (rate) {
    // @TODO: Should we clamp this or is it fun to just go nuts with the rate?
    this.rate = Math.Util.clamp(rate, -500, 500);
  }

  setCurrentTime (time) {
    this.currentTime = MathUtil.clamp(time, 0.0, this.frames / this.fps);
  }

  toJSON () {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      size: this.size,
      direction: this.direction,
      visible: this.visible,
      blocks: this.blocks._blocks,
      variables: this.variables,
      lists: this.lists,

      fps: this.fps,
      frames: this.frames,
      currentTime: this.currentTime,
      playbackRate: this.playbackRate
    }
  }

}

module.exports = VideoTarget;
