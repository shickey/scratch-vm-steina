const log = require('../util/log');
const Target = require('../engine/target');
const MathUtil = require('../util/math-util');

/**
 * Video target: runtime object representing the state of a video object
 * 
 * This declares several of the variables and functions of RenderedTarget
 * allowing us to use many of the motion and looks blocks out the box
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
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.x = 0;
    this.y = 0;
    this.direction = 90;
    this.visible = true;
    this.size = 100;
    this.effects = {
      color: 0,
      whirl: 0,
      brightness: 0,
      ghost: 0
    };

    // Video specific state
    this.tapped = false;
    this.playing = false;
    this.fps = 30.0;
    this.frames = 0;
    this.currentFrame = 0;
    this.playbackRate = 100;

    this.runtimeVideoState = runtime.videoState;

    if (!!videoInfo) {
      this.fps = videoInfo.fps;
      this.frames = videoInfo.frames;
    }
  }

  // Functions from RenderedTarget
  setXY (x, y, force) {
    if (this.dragging && !force) return;
    if (this.dragging) {
      this.x = x + this.dragOffsetX;
      this.y = y + this.dragOffsetY;
    }
    else {
      this.x = x;
      this.y = y;
    }
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
    var order = this.runtimeVideoState.order;
    var index = order.indexOf(this.id);
    if (index === -1) {
      log.warn(`Unable to find video target id ${this.id} in drawing order array`);
      return;
    }
    order.splice(index, 1);
    order.push(this.id);
  }

  goToBack () {
    var order = this.runtimeVideoState.order;
    var index = order.indexOf(this.id);
    if (index === -1) {
      log.warn(`Unable to find video target id ${this.id} in drawing order array`);
      return;
    }
    order.splice(index, 1);
    order.unshift(this.id);
  }

  goForwardLayers (nLayers) {
    var order = this.runtimeVideoState.order;
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
    var order = this.runtimeVideoState.order;
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

  setEffect(effectName, value) {
    if (!this.effects.hasOwnProperty(effectName)) return;
    this.effects[effectName] = value;
    this.runtime.requestRedraw();
  }

  clearEffects() {
    for (const effectName in this.effects) {
      if (!this.effects.hasOwnProperty(effectName)) continue;
      this.effects[effectName] = 0;
    }
    this.runtime.requestRedraw();
  }
  

  // Video functions

  // Sets the video play state
  // If set to true, the video will begin playing without blocking the thread
  setPlaying (playing) {
    if (this.playing === !!playing) { return; }
    
    this.playing = !!playing
    if (this.playing) {
      this.runtimeVideoState.playing.push(this.id)
    }
    else {
      let idx = this.runtimeVideoState.playing.indexOf(this.id)
      if (idx !== -1) {
        this.runtimeVideoState.playing.splice(idx, 1);
      }
    }
    this.runtime.requestRedraw();
  }

  setRate (rate) {
    // @TODO: Should we clamp this or is it fun to just go nuts with the rate?
    this.playbackRate = MathUtil.clamp(rate, -1000, 1000);
    this.runtime.requestRedraw();
  }

  setCurrentFrame (frame) {
    this.currentFrame = MathUtil.clamp(frame, 0, this.frames - 1);
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
      effects: this.effects,
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

  duplicate () {
    var newTarget = new VideoTarget(this.runtime); // We purposefully don't provide an id here and
                                                   // instead overwrite it after duplication so that
                                                   // this method matches the signature of the standard
                                                   // sprite duplication method

    newTarget.x = Math.random() * 400 / 2; // These match the implementation for standard sprites
    newTarget.y = Math.random() * 300 / 2;
    newTarget.direction = this.direction;
    newTarget.visible = this.visible;
    newTarget.size = this.size;
    newTarget.effects = JSON.parse(JSON.stringify(this.effects))

    // Video specific state
    newTarget.fps = this.fps;
    newTarget.frames = this.frames;
    newTarget.currentFrame = this.currentFrame;
    newTarget.playbackRate = this.playbackRate;

    newTarget.runtimeVideoState = this.runtime.videoState;

    // Copy blocks, vars, etc.
    newTarget.blocks = this.blocks.duplicate();
    newTarget.variables = JSON.parse(JSON.stringify(this.variables));
    newTarget.lists = JSON.parse(JSON.stringify(this.lists));

    return newTarget;
  }

}

module.exports = VideoTarget;
