const log = require('../util/log');
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
    this.dragging = false;
    this.x = 0;
    this.y = 0;
    this.direction = 90;
    this.visible = true;
    this.size = 100;

    // Video specific variables
    this.fps = 30.0;
    this.frames = 0;
    this.currentFrame = 0;
    this.playbackRate = 100;

    this.drawInfo = runtime.videoTargetDrawInfo;

    if (!!videoInfo) {
      this.fps = videoInfo.fps;
      this.frames = videoInfo.frames;
    }
  }

  // Functions from RenderedTarget
  setXY (x, y, force) {
    if (this.dragging && !force) return;
    this.x = x;
    this.y = y;
    this.runtime.requestRedraw();
  }

  setDirection (direction) {
    this.direction = MathUtil.wrapClamp(direction, -179, 180);
    this.runtime.requestRedraw();
  }

  setVisible (visible) {
    this.visible = !!visible;
    this.runtime.requestRedraw();
  }
  
  setSize (size) {
    this.size = MathUtil.clamp(size, 1, 500);
    this.runtime.requestRedraw();
  }

  goToFront () {
    var order = this.drawInfo.order;
    var index = order.indexOf(this.id);
    if (index === -1) {
      log.warn(`Unable to find video target id ${this.id} in drawing order array`);
      return;
    }
    order.splice(index, 1);
    order.push(this.id);
  }

  goToBack () {
    var order = this.drawInfo.order;
    var index = order.indexOf(this.id);
    if (index === -1) {
      log.warn(`Unable to find video target id ${this.id} in drawing order array`);
      return;
    }
    order.splice(index, 1);
    order.unshift(this.id);
  }

  goForwardLayers (nLayers) {
    var order = this.drawInfo.order;
    var index = order.indexOf(this.id);
    if (index === -1) {
      log.warn(`Unable to find video target id ${this.id} in drawing order array`);
      return;
    }
    order.splice(index, 1);
    index += nLayers;
    if (index >= order.length) {
      index = order.length;
    }
    order.splice(index, 0, this.id);
  }

  goBackwardLayers (nLayers) {
    var order = this.drawInfo.order;
    var index = order.indexOf(this.id);
    if (index === -1) {
      log.warn(`Unable to find video target id ${this.id} in drawing order array`);
      return;
    }
    order.splice(index, 1);
    index -= nLayers;
    if (index < 0) {
      index = 0;
    }
    order.splice(index, 0, this.id);
  }

  startDrag() {
    this.dragging = true;
  }

  stopDrag() {
    this.dragging = false;
  }
  

  // Video functions
  setRate (rate) {
    // @TODO: Should we clamp this or is it fun to just go nuts with the rate?
    this.playbackRate = MathUtil.clamp(rate, -1000, 1000);
    this.runtime.requestRedraw();
  }

  setCurrentFrame (frame) {
    this.currentFrame = MathUtil.clamp(frame, 0, this.frames);
    this.runtime.requestRedraw();
  }

  toJSON () {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      size: this.size,
      direction: this.direction,
      visible: this.visible,
      blocks: {
        _blocks: this.blocks._blocks,
        _scripts: this.blocks._scripts,
      },
      variables: this.variables,
      lists: this.lists,

      fps: this.fps,
      frames: this.frames,
      currentFrame: this.currentFrame,
      playbackRate: this.playbackRate
    }
  }

}

module.exports = VideoTarget;
