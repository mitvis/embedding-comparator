(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('vega-canvas'), require('vega-scenegraph'), require('vega-dataflow'), require('vega-util')) :
  typeof define === 'function' && define.amd ? define(['exports', 'vega-canvas', 'vega-scenegraph', 'vega-dataflow', 'vega-util'], factory) :
  (factory((global.vegaLabel = {}),global.vega,global.vega,global.vega,global.vega));
}(this, (function (exports,vegaCanvas,vegaScenegraph,vegaDataflow,vegaUtil) { 'use strict';

  /*eslint no-console: "warn"*/
  /*eslint no-empty: "warn"*/

  /**
   * Calculate width of `text` with font size `fontSize` and font `font`
   * @param {object} context 2d-context of canvas
   * @param {string} text the string, which width to be calculated
   * @param {number} fontSize font size of `text`
   * @param {string} font font of `text`
   */
  function labelWidth(context, text, fontSize, font) {
    // TODO: support other font properties
    context.font = fontSize + 'px ' + font;
    return context.measureText(text).width;
  }

  function checkCollision(x1, y1, x2, y2, bitMap) {
    return bitMap.getInRangeScaled(x1, y2, x2, y2) || bitMap.getInRangeScaled(x1, y1, x2, y2 - 1);
  }

  /*eslint no-console: "warn"*/

  const SIZE_FACTOR = 0.707106781186548; // this is 1 over square root of 2

  // Options for align
  const ALIGN = ['right', 'center', 'left'];

  // Options for baseline
  const BASELINE = ['bottom', 'middle', 'top'];

  class LabelPlacer {
    constructor(bitmaps, size, anchors, offsets) {
      this.bm0 = bitmaps[0];
      this.bm1 = bitmaps[1];
      this.width = size[0];
      this.height = size[1];
      this.anchors = anchors;
      this.offsets = offsets;
    }

    place(d) {
      const mb = d.markBound;
      // can not be placed if the mark is not visible in the graph bound
      if (mb[2] < 0 || mb[5] < 0 || mb[0] > this.width || mb[3] > this.height) {
        return false;
      }

      const context = vegaCanvas.canvas().getContext('2d');
      const n = this.offsets.length;
      const textHeight = d.textHeight;
      const markBound = d.markBound;
      const text = d.text;
      const font = d.font;
      let textWidth = d.textWidth;
      let dx, dy, isInside, sizeFactor, insideFactor;
      let x, x1, xc, x2, y1, yc, y2;
      let _x1, _x2, _y1, _y2;

      // for each anchor and offset
      for (let i = 0; i < n; i++) {
        dx = (this.anchors[i] & 0x3) - 1;
        dy = ((this.anchors[i] >>> 0x2) & 0x3) - 1;

        isInside = (dx === 0 && dy === 0) || this.offsets[i] < 0;
        sizeFactor = dx && dy ? SIZE_FACTOR : 1;
        insideFactor = this.offsets[i] < 0 ? -1 : 1;

        yc = markBound[4 + dy] + (insideFactor * textHeight * dy) / 2.0 + this.offsets[i] * dy * sizeFactor;
        x = markBound[1 + dx] + this.offsets[i] * dx * sizeFactor;

        y1 = yc - textHeight / 2.0;
        y2 = yc + textHeight / 2.0;

        _y1 = this.bm0.scalePixel(y1);
        _y2 = this.bm0.scalePixel(y2);
        _x1 = this.bm0.scalePixel(x);

        if (!textWidth) {
          // to avoid finding width of text label,
          if (!isLabelPlacable(_x1, _x1, _y1, _y2, this.bm0, this.bm1, x, x, y1, y2, markBound, isInside)) {
            // skip this anchor/offset option if fail to place the label with 1px width
            continue;
          } else {
            // Otherwise, find the label width
            textWidth = labelWidth(context, text, textHeight, font);
          }
        }

        xc = x + (insideFactor * textWidth * dx) / 2.0;
        x1 = xc - textWidth / 2.0;
        x2 = xc + textWidth / 2.0;

        _x1 = this.bm0.scalePixel(x1);
        _x2 = this.bm0.scalePixel(x2);

        if (isLabelPlacable(_x1, _x2, _y1, _y2, this.bm0, this.bm1, x1, x2, y1, y2, markBound, isInside)) {
          // place label if the position is placable
          d.x = !dx ? xc : dx * insideFactor < 0 ? x2 : x1;
          d.y = !dy ? yc : dy * insideFactor < 0 ? y2 : y1;

          d.align = ALIGN[dx * insideFactor + 1];
          d.baseline = BASELINE[dy * insideFactor + 1];

          this.bm0.markInRangeScaled(_x1, _y1, _x2, _y2);
          return true;
        }
      }
      return false;
    }
  }

  function isLabelPlacable(_x1, _x2, _y1, _y2, bm0, bm1, x1, x2, y1, y2, markBound, isInside) {
    return !(
      bm0.searchOutOfBound(_x1, _y1, _x2, _y2) ||
      (isInside
        ? checkCollision(_x1, _y1, _x2, _y2, bm1) || !isInMarkBound(x1, y1, x2, y2, markBound)
        : checkCollision(_x1, _y1, _x2, _y2, bm0))
    );
  }

  function isInMarkBound(x1, y1, x2, y2, markBound) {
    return markBound[0] <= x1 && x2 <= markBound[2] && markBound[3] <= y1 && y2 <= markBound[5];
  }

  /*eslint no-console: "warn"*/

  const X_DIR = [-1, -1, 1, 1];
  const Y_DIR = [-1, 1, -1, 1];

  class AreaLabelPlacer {
    constructor(bitmaps, size, avoidBaseMark) {
      this.bm0 = bitmaps[0];
      this.bm1 = bitmaps[1];
      this.bm2 = bitmaps[2];
      this.width = size[0];
      this.height = size[1];
      this.avoidBaseMark = avoidBaseMark;
    }

    place(d) {
      const context = vegaCanvas.canvas().getContext('2d');
      const items = d.datum.datum.items[0].items;
      const n = items.length;
      const textHeight = d.textHeight;
      const textWidth = labelWidth(context, d.text, textHeight, d.font);
      const pixelRatio = this.bm1.getPixelRatio();
      const stack = new Stack();
      let maxSize = this.avoidBaseMark ? textHeight : 0;
      let labelPlaced = false;
      let labelPlaced2 = false;
      let maxAreaWidth = 0;
      let x1, x2, y1, y2, x, y, _x, _y, lo, hi, mid, areaWidth, coordinate, nextX, nextY;

      for (let i = 0; i < n; i++) {
        x1 = items[i].x;
        y1 = items[i].y;
        x2 = items[i].x2 === undefined ? x1 : items[i].x2;
        y2 = items[i].y2 === undefined ? y1 : items[i].y2;
        stack.push(this.bm0.scalePixel((x1 + x2) / 2.0), this.bm0.scalePixel((y1 + y2) / 2.0));
        while (!stack.isEmpty()) {
          coordinate = stack.pop();
          _x = coordinate[0];
          _y = coordinate[1];
          if (!this.bm0.getScaled(_x, _y) && !this.bm1.getScaled(_x, _y) && !this.bm2.getScaled(_x, _y)) {
            this.bm2.markScaled(_x, _y);
            for (let j = 0; j < 4; j++) {
              nextX = _x + X_DIR[j];
              nextY = _y + Y_DIR[j];
              if (!this.bm2.searchOutOfBound(nextX, nextY, nextX, nextY)) {
                stack.push(nextX, nextY);
              }
            }

            x = _x * pixelRatio - this.bm0.padding;
            y = _y * pixelRatio - this.bm0.padding;
            lo = maxSize;
            hi = this.height; // Todo: make this bound smaller;
            if (
              !checkLabelOutOfBound(x, y, textWidth, textHeight, this.width, this.height) &&
              !collide(x, y, textHeight, textWidth, lo, this.bm0, this.bm1)
            ) {
              while (hi - lo >= 1) {
                mid = (lo + hi) / 2;
                if (collide(x, y, textHeight, textWidth, mid, this.bm0, this.bm1)) {
                  hi = mid;
                } else {
                  lo = mid;
                }
              }
              if (lo > maxSize) {
                d.x = x;
                d.y = y;
                maxSize = lo;
                labelPlaced = true;
              }
            }
          }
        }
        if (!labelPlaced && !this.avoidBaseMark) {
          areaWidth = Math.abs(x2 - x1 + y2 - y1);
          x = (x1 + x2) / 2.0;
          y = (y1 + y2) / 2.0;
          if (
            areaWidth >= maxAreaWidth &&
            !checkLabelOutOfBound(x, y, textWidth, textHeight, this.width, this.height) &&
            !collide(x, y, textHeight, textWidth, textHeight, this.bm0, null)
          ) {
            maxAreaWidth = areaWidth;
            d.x = x;
            d.y = y;
            labelPlaced2 = true;
          }
        }
      }

      if (labelPlaced || labelPlaced2) {
        x1 = this.bm0.scalePixel(d.x - textWidth / 2.0);
        y1 = this.bm0.scalePixel(d.y - textHeight / 2.0);
        x2 = this.bm0.scalePixel(d.x + textWidth / 2.0);
        y2 = this.bm0.scalePixel(d.y + textHeight / 2.0);
        this.bm0.markInRangeScaled(x1, y1, x2, y2);
        d.align = 'center';
        d.baseline = 'middle';
        return true;
      }

      d.align = 'left';
      d.baseline = 'top';
      return false;
    }
  }

  function checkLabelOutOfBound(x, y, textWidth, textHeight, width, height) {
    return (
      x - textWidth / 2.0 < 0 || y - textHeight / 2.0 < 0 || x + textWidth / 2.0 > width || y + textHeight / 2.0 > height
    );
  }

  function collide(x, y, textHeight, textWidth, h, bm0, bm1) {
    const w = (textWidth * h) / (textHeight * 2.0);
    h = h / 2.0;
    const _x1 = bm0.scalePixel(x - w);
    const _x2 = bm0.scalePixel(x + w);
    const _y1 = bm0.scalePixel(y - h);
    const _y2 = bm0.scalePixel(y + h);

    return (
      bm0.searchOutOfBound(_x1, _y1, _x2, _y2) ||
      checkCollision(_x1, _y1, _x2, _y2, bm0) ||
      (bm1 && checkCollision(_x1, _y1, _x2, _y2, bm1))
    );
  }

  class Stack {
    constructor() {
      this.size = 100;
      this.xStack = new Int32Array(this.size);
      this.yStack = new Int32Array(this.size);
      this.idx = 0;
    }

    push(x, y) {
      if (this.idx === this.size - 1) resizeStack(this);
      this.xStack[this.idx] = x;
      this.yStack[this.idx] = y;
      this.idx++;
    }

    pop() {
      if (this.idx > 0) {
        this.idx--;
        return [this.xStack[this.idx], this.yStack[this.idx]];
      } else {
        return null;
      }
    }

    isEmpty() {
      return this.idx <= 0;
    }
  }

  function resizeStack(obj) {
    const newXStack = new Int32Array(obj.size * 2);
    const newYStack = new Int32Array(obj.size * 2);

    for (let i = 0; i < obj.idx; i++) {
      newXStack[i] = obj.xStack[i];
      newYStack[i] = obj.yStack[i];
    }
    obj.xStack = newXStack;
    obj.yStack = newYStack;
    obj.size *= 2;
  }

  /*eslint no-fallthrough: "warn" */

  const DIV = 0x5;
  const MOD = 0x1f;
  const SIZE = 0x20;
  const right0 = new Uint32Array(SIZE + 1);
  const right1 = new Uint32Array(SIZE + 1);

  right1[0] = 0x0;
  right0[0] = ~right1[0];
  for (let i = 1; i <= SIZE; i++) {
    right1[i] = (right1[i - 1] << 0x1) | 0x1;
    right0[i] = ~right1[i];
  }

  function applyMark(array, index, mask) {
    array[index] |= mask;
  }

  function applyUnmark(array, index, mask) {
    array[index] &= mask;
  }

  class BitMap {
    constructor(width, height, padding) {
      this.pixelRatio = Math.sqrt((width * height) / 1000000.0);

      // bound pixelRatio to be not less than 1
      if (this.pixelRatio < 1) {
        this.pixelRatio = 1;
      }

      this.padding = padding;

      this.width = ~~((width + 2 * padding + this.pixelRatio) / this.pixelRatio);
      this.height = ~~((height + 2 * padding + this.pixelRatio) / this.pixelRatio);

      this.array = new Uint32Array(~~((this.width * this.height + SIZE) / SIZE));
    }

    /**
     * Get pixel ratio between real size and bitmap size
     * @returns pixel ratio between real size and bitmap size
     */
    getPixelRatio() {
      return this.pixelRatio;
    }

    /**
     * Scale real pixel in the chart into bitmap pixel
     * @param realPixel the real pixel to be scaled down
     * @returns scaled pixel
     */
    scalePixel(realPixel) {
      return ~~((realPixel + this.padding) / this.pixelRatio);
    }

    markScaled(x, y) {
      const mapIndex = y * this.width + x;
      applyMark(this.array, mapIndex >>> DIV, 1 << (mapIndex & MOD));
    }

    mark(x, y) {
      this.markScaled(this.scalePixel(x), this.scalePixel(y));
    }

    unmarkScaled(x, y) {
      const mapIndex = y * this.width + x;
      applyUnmark(this.array, mapIndex >>> DIV, ~(1 << (mapIndex & MOD)));
    }

    unmark(x, y) {
      this.unmarkScaled(this.scalePixel(x), this.scalePixel(y));
    }

    getScaled(x, y) {
      const mapIndex = y * this.width + x;
      return this.array[mapIndex >>> DIV] & (1 << (mapIndex & MOD));
    }

    get(x, y) {
      return this.getScaled(this.scalePixel(x), this.scalePixel(y));
    }

    markInRangeScaled(x, y, x2, y2) {
      let start, end, indexStart, indexEnd;
      for (; y <= y2; y++) {
        start = y * this.width + x;
        end = y * this.width + x2;
        indexStart = start >>> DIV;
        indexEnd = end >>> DIV;
        if (indexStart === indexEnd) {
          applyMark(this.array, indexStart, right0[start & MOD] & right1[(end & MOD) + 1]);
        } else {
          applyMark(this.array, indexStart, right0[start & MOD]);
          applyMark(this.array, indexEnd, right1[(end & MOD) + 1]);

          for (let i = indexStart + 1; i < indexEnd; i++) {
            applyMark(this.array, i, 0xffffffff);
          }
        }
      }
    }

    markInRange(x, y, x2, y2) {
      return this.markInRangeScaled(this.scalePixel(x), this.scalePixel(y), this.scalePixel(x2), this.scalePixel(y2));
    }

    unmarkInRangeScaled(x, y, x2, y2) {
      let start, end, indexStart, indexEnd;
      for (; y <= y2; y++) {
        start = y * this.width + x;
        end = y * this.width + x2;
        indexStart = start >>> DIV;
        indexEnd = end >>> DIV;
        if (indexStart === indexEnd) {
          applyUnmark(this.array, indexStart, right1[start & MOD] | right0[(end & MOD) + 1]);
        } else {
          applyUnmark(this.array, indexStart, right1[start & MOD]);
          applyUnmark(this.array, indexEnd, right0[(end & MOD) + 1]);

          for (let i = indexStart + 1; i < indexEnd; i++) {
            applyUnmark(this.array, i, 0x0);
          }
        }
      }
    }

    unmarkInRange(x, y, x2, y2) {
      return this.unmarkInRangeScaled(this.scalePixel(x), this.scalePixel(y), this.scalePixel(x2), this.scalePixel(y2));
    }

    getInRangeScaled(x, y, x2, y2) {
      let start, end, indexStart, indexEnd;
      for (; y <= y2; y++) {
        start = y * this.width + x;
        end = y * this.width + x2;
        indexStart = start >>> DIV;
        indexEnd = end >>> DIV;
        if (indexStart === indexEnd) {
          if (this.array[indexStart] & right0[start & MOD] & right1[(end & MOD) + 1]) {
            return true;
          }
        } else {
          if (this.array[indexStart] & right0[start & MOD]) {
            return true;
          }
          if (this.array[indexEnd] & right1[(end & MOD) + 1]) {
            return true;
          }

          for (let i = indexStart + 1; i < indexEnd; i++) {
            if (this.array[i]) {
              return true;
            }
          }
        }
      }
      return false;
    }

    getInRange(x, y, x2, y2) {
      return this.getInRangeScaled(this.scalePixel(x), this.scalePixel(y), this.scalePixel(x2), this.scalePixel(y2));
    }

    searchOutOfBound(x, y, x2, y2) {
      return x < 0 || y < 0 || y2 >= this.height || x2 >= this.width;
    }
  }

  // static function

  // bit mask for getting first 2 bytes of alpha value
  const ALPHA_MASK = 0xff000000;

  // alpha value equivalent to opacity 0.0625
  const INSIDE_OPACITY_IN_ALPHA = 0x10000000;
  const INSIDE_OPACITY = 0.0625;

  /**
   * Get bitmaps and fill the with mark information from data
   * @param {array} data data of labels to be placed
   * @param {array} size size of chart in format [width, height]
   * @param {string} marktype marktype of the base mark
   * @param {bool} avoidBaseMark a flag if base mark is to be avoided
   * @param {array} avoidMarks array of mark data to be avoided
   * @param {bool} labelInside a flag if label to be placed inside mark or not
   * @param {number} padding padding from the boundary of the chart
   *
   * @returns array of 2 bitmaps:
   *          - first bitmap is filled with all the avoiding marks
   *          - second bitmap is filled with borders of all the avoiding marks (second bit map can be
   *            undefined if checking border of base mark is not needed when not avoiding any mark)
   */
  function prepareBitmap(data, size, marktype, avoidBaseMark, avoidMarks, labelInside, padding) {
    const isGroupArea = marktype === 'group' && data[0].datum.datum.items[0].marktype === 'area';
    const width = size[0];
    const height = size[1];
    const n = data.length;

    // extract data information from base mark when base mark is to be avoid
    // or base mark is implicitly avoid when base mark is group area
    if (marktype && (avoidBaseMark || isGroupArea)) {
      const items = new Array(n);
      for (let i = 0; i < n; i++) {
        items[i] = data[i].datum.datum;
      }
      avoidMarks.push(items);
    }

    if (avoidMarks.length) {
      // when there is at least one mark to be avoided
      const context = writeToCanvas(avoidMarks, width, height, labelInside || isGroupArea);
      return writeToBitMaps(context, width, height, labelInside, isGroupArea, padding);
    } else {
      const bitMap = new BitMap(width, height, padding);
      if (avoidBaseMark) {
        // when there is no base mark but data points are to be avoided
        for (let i = 0; i < n; i++) {
          const d = data[i];
          bitMap.mark(d.markBound[0], d.markBound[3]);
        }
      }
      return [bitMap, undefined];
    }
  }

  /**
   * Write marks to be avoided to canvas to be written to bitmap later
   * @param {array} avoidMarks array of mark data to be avoided
   * @param {number} width width of the chart
   * @param {number} height height of the chart
   * @param {bool} labelInside a flag if label to be placed inside mark or not
   *
   * @returns canvas context, to which all avoiding marks are drawn
   */
  function writeToCanvas(avoidMarks, width, height, labelInside) {
    const m = avoidMarks.length;
    // const c = document.getElementById('canvas-render'); // debugging canvas
    const c = document.createElement('canvas');
    const context = c.getContext('2d');
    let originalItems, itemsLen;
    c.setAttribute('width', width);
    c.setAttribute('height', height);

    // draw every avoiding marks into canvas
    for (let i = 0; i < m; i++) {
      originalItems = avoidMarks[i];
      itemsLen = originalItems.length;
      if (!itemsLen) {
        continue;
      }

      if (originalItems[0].mark.marktype !== 'group') {
        drawMark(context, originalItems, labelInside);
      } else {
        drawGroup(context, originalItems, labelInside);
      }
    }

    return context;
  }

  /**
   * Write avoid marks from drawn canvas to bitmap
   * @param {object} context canvas context, to which all avoiding marks are drawn
   * @param {number} width width of the chart
   * @param {number} height height of the chart
   * @param {bool} labelInside a flag if label to be placed inside mark or not
   * @param {bool} isGroupArea a flag if the base mark if group area
   * @param {number} padding padding from the boundary of the chart
   *
   * @returns array of 2 bitmaps:
   *          - first bitmap is filled with all the avoiding marks
   *          - second bitmap is filled with borders of all the avoiding marks
   */
  function writeToBitMaps(context, width, height, labelInside, isGroupArea, padding) {
    const layer1 = new BitMap(width, height, padding);
    const layer2 = (labelInside || isGroupArea) && new BitMap(width, height, padding);
    const imageData = context.getImageData(0, 0, width, height);
    const canvasBuffer = new Uint32Array(imageData.data.buffer);
    let x, y, alpha;

    if (isGroupArea) {
      for (y = 0; y < height; y++) {
        for (x = 0; x < width; x++) {
          alpha = canvasBuffer[y * width + x] & ALPHA_MASK;
          // only fill second layer for group area because labels are only not allowed to place over
          // border of area
          if (alpha && alpha ^ INSIDE_OPACITY_IN_ALPHA) {
            layer2.mark(x, y);
          }
        }
      }
    } else {
      for (y = 0; y < height; y++) {
        for (x = 0; x < width; x++) {
          alpha = canvasBuffer[y * width + x] & ALPHA_MASK;
          if (alpha) {
            // fill first layer if there is something in canvas in that location
            layer1.mark(x, y);

            // fill second layer if there is a border in canvas in that location
            // and label can be placed inside
            if (labelInside && alpha ^ INSIDE_OPACITY_IN_ALPHA) {
              layer2.mark(x, y);
            }
          }
        }
      }
    }
    return [layer1, layer2];
  }

  /**
   * Draw mark into canvas
   * @param {object} context canvas context, to which all avoiding marks are drawn
   * @param {array} originalItems mark to be drawn into canvas
   * @param {bool} labelInside a flag if label to be placed inside mark or not
   */
  function drawMark(context, originalItems, labelInside) {
    const n = originalItems.length;
    let items;
    if (labelInside) {
      items = new Array(n);
      for (let i = 0; i < n; i++) {
        items[i] = prepareMarkItem(originalItems[i]);
      }
    } else {
      items = originalItems;
    }

    // draw items into canvas
    vegaScenegraph.Marks[items[0].mark.marktype].draw(context, {items: items}, null);
  }

  /**
   * draw group of marks into canvas
   * @param {object} context canvas context, to which all avoiding marks are drawn
   * @param {array} groups group of marks to be drawn into canvas
   * @param {bool} labelInside a flag if label to be placed inside mark or not
   */
  function drawGroup(context, groups, labelInside) {
    const n = groups.length;
    let marks;
    for (let i = 0; i < n; i++) {
      marks = groups[i].items;
      for (let j = 0; j < marks.length; j++) {
        const g = marks[j];
        if (g.marktype !== 'group') {
          drawMark(context, g.items, labelInside);
        } else {
          // recursivly draw group of marks
          drawGroup(context, g.items, labelInside);
        }
      }
    }
  }

  /**
   * Prepare item before drawing into canvas (setting stroke and opacity)
   * @param {object} originalItem item to be prepared
   *
   * @returns prepared item
   */
  function prepareMarkItem(originalItem) {
    const item = {};
    for (const key in originalItem) {
      item[key] = originalItem[key];
    }
    if (item.stroke) {
      item.strokeOpacity = 1;
    }

    if (item.fill) {
      item.fillOpacity = INSIDE_OPACITY;
      item.stroke = '#000';
      item.strokeOpacity = 1;
      item.strokeWidth = 2;
    }
    return item;
  }

  /*eslint no-console: "warn"*/

  // 8-bit representation of anchors
  const TOP = 0x0,
    MIDDLE = 0x1 << 0x2,
    BOTTOM = 0x2 << 0x2,
    LEFT = 0x0,
    CENTER = 0x1,
    RIGHT = 0x2;

  // Dictionary mapping from text anchor to its number representation
  const anchorTextToNumber = {
    'top-left': TOP + LEFT,
    top: TOP + CENTER,
    'top-right': TOP + RIGHT,
    left: MIDDLE + LEFT,
    middle: MIDDLE + CENTER,
    right: MIDDLE + RIGHT,
    'bottom-left': BOTTOM + LEFT,
    bottom: BOTTOM + CENTER,
    'bottom-right': BOTTOM + RIGHT
  };

  function labelLayout() {
    let offsets, sort, anchors, avoidMarks, size;
    let avoidBaseMark, lineAnchor, markIndex, padding;
    let label = {},
      texts = [];

    label.layout = function() {
      const n = texts.length;
      if (!n) {
        // return immediately when there is not a label to be placed
        return texts;
      }

      if (!size || size.length !== 2) {
        throw Error('Size of chart should be specified as an array of width and height');
      }

      const data = new Array(n);
      const marktype = texts[0].datum && texts[0].datum.mark && texts[0].datum.mark.marktype;
      const grouptype = marktype === 'group' && texts[0].datum.items[markIndex].marktype;
      const getMarkBoundary = getMarkBoundaryFactory(marktype, grouptype, lineAnchor, markIndex);
      const getOriginalOpacity = getOriginalOpacityFactory(texts[0].transformed);

      // prepare text mark data for placing
      for (let i = 0; i < n; i++) {
        const d = texts[i];

        data[i] = {
          textWidth: undefined,
          textHeight: d.fontSize, // fontSize represents text height of a text
          fontSize: d.fontSize,
          font: d.font,
          text: d.text,
          sort: sort && sort(d.datum),
          markBound: getMarkBoundary(d),
          originalOpacity: getOriginalOpacity(d),
          opacity: 0,
          datum: d
        };
      }

      if (sort) {
        // sort field has to be primitive variable type
        data.sort((a, b) => a.sort - b.sort);
      }

      // a flag for determining if it is possible for label to be placed inside its base mark
      let labelInside = false;
      for (let i = 0; i < anchors.length && !labelInside; i++) {
        // label inside if anchor is at center
        // label inside if offset to be inside the mark bound
        labelInside |= anchors[i] === 0x5 || offsets[i] < 0;
      }

      const bitmaps = prepareBitmap(data, size, marktype, avoidBaseMark, avoidMarks, labelInside, padding);
      if (grouptype === 'area') {
        // area chart need another bitmap to find the shape of each area
        bitmaps.push(new BitMap(size[0], size[1], padding));
      }

      const labelPlacer =
        grouptype === 'area'
          ? new AreaLabelPlacer(bitmaps, size, avoidBaseMark)
          : new LabelPlacer(bitmaps, size, anchors, offsets);

      // place all label
      for (let i = 0; i < n; i++) {
        const d = data[i];
        if (d.originalOpacity !== 0 && labelPlacer.place(d)) {
          d.opacity = d.originalOpacity;
        }
      }

      return data;
    };

    label.texts = function(_) {
      if (arguments.length) {
        texts = _;
        return label;
      } else {
        return texts;
      }
    };

    label.offset = function(_, len) {
      if (arguments.length) {
        const n = _.length;
        offsets = new Float64Array(len);

        for (let i = 0; i < n; i++) {
          offsets[i] = _[i] || 0;
        }

        for (let i = n; i < len; i++) {
          offsets[i] = offsets[n - 1];
        }

        return label;
      } else {
        return offsets;
      }
    };

    label.anchor = function(_, len) {
      if (arguments.length) {
        const n = _.length;
        anchors = new Int8Array(len);

        for (let i = 0; i < n; i++) {
          anchors[i] |= anchorTextToNumber[_[i]];
        }

        for (let i = n; i < len; i++) {
          anchors[i] = anchors[n - 1];
        }

        return label;
      } else {
        return anchors;
      }
    };

    label.sort = function(_) {
      if (arguments.length) {
        sort = _;
        return label;
      } else {
        return sort;
      }
    };

    label.avoidMarks = function(_) {
      if (arguments.length) {
        avoidMarks = _;
        return label;
      } else {
        return sort;
      }
    };

    label.size = function(_) {
      if (arguments.length) {
        size = _;
        return label;
      } else {
        return size;
      }
    };

    label.avoidBaseMark = function(_) {
      if (arguments.length) {
        avoidBaseMark = _;
        return label;
      } else {
        return avoidBaseMark;
      }
    };

    label.lineAnchor = function(_) {
      if (arguments.length) {
        lineAnchor = _;
        return label;
      } else {
        return lineAnchor;
      }
    };

    label.markIndex = function(_) {
      if (arguments.length) {
        markIndex = _;
        return label;
      } else {
        return markIndex;
      }
    };

    label.padding = function(_) {
      if (arguments.length) {
        padding = _;
        return label;
      } else {
        return padding;
      }
    };

    return label;
  }

  /**
   * Factory function for geting original opacity from a data point information.
   * @param {boolean} transformed a boolean flag if data points are already transformed
   *
   * @return a function that return originalOpacity property of a data point if
   *         transformed. Otherwise, a function that return .opacity property of a data point
   */
  function getOriginalOpacityFactory(transformed) {
    if (transformed) {
      return d => d.originalOpacity;
    } else {
      return d => d.opacity;
    }
  }

  /**
   * Factory function for function for getting base mark boundary, depending on mark and group type.
   * When mark type is undefined, line or area: boundary is the coordinate of each data point.
   * When base mark is grouped line, boundary is either at the beginning or end of the line depending
   * on the value of lineAnchor.
   * Otherwise, use boundary of base mark.
   *
   * @param {string} marktype mark type of base mark (marktype can be undefined if label does not use
   *                          reactive geometry to any other mark)
   * @param {string} grouptype group type of base mark if mark type is 'group' (grouptype can be
   *                           undefined if the base mark is not in group)
   * @param {string} lineAnchor anchor point of group line mark if group type is 'line' can be either
   *                            'begin' or 'end'
   * @param {number} markIndex index of base mark if base mark is in a group with multiple marks
   *
   * @returns function(d) for getting mark boundary from data point information d
   */
  function getMarkBoundaryFactory(marktype, grouptype, lineAnchor, markIndex) {
    if (!marktype) {
      // no reactive geometry
      return d => [d.x, d.x, d.x, d.y, d.y, d.y];
    } else if (marktype === 'line' || marktype === 'area') {
      return function(d) {
        const datum = d.datum;
        return [datum.x, datum.x, datum.x, datum.y, datum.y, datum.y];
      };
    } else if (grouptype === 'line') {
      const endItemIndex = lineAnchor === 'begin' ? m => m - 1 : () => 0;
      return function(d) {
        const items = d.datum.items[markIndex].items;
        const m = items.length;
        if (m) {
          // this line has at least 1 item
          const endItem = items[endItemIndex(m)];
          return [endItem.x, endItem.x, endItem.x, endItem.y, endItem.y, endItem.y];
        } else {
          // empty line
          const minInt = Number.MIN_SAFE_INTEGER;
          return [minInt, minInt, minInt, minInt, minInt, minInt];
        }
      };
    } else {
      return function(d) {
        const b = d.datum.bounds;
        return [b.x1, (b.x1 + b.x2) / 2.0, b.x2, b.y1, (b.y1 + b.y2) / 2.0, b.y2];
      };
    }
  }

  /*eslint no-console: "warn"*/

  const Output = ['x', 'y', 'opacity', 'align', 'baseline', 'originalOpacity', 'transformed'];

  const Params = ['offset'];

  const defaultAnchors = ['top-left', 'left', 'bottom-left', 'top', 'bottom', 'top-right', 'right', 'bottom-right'];

  function Label(params) {
    vegaDataflow.Transform.call(this, labelLayout(), params);
  }

  Label.Definition = {
    type: 'Label',
    metadata: {modifies: true},
    params: [
      {name: 'padding', type: 'number', default: 0},
      {name: 'markIndex', type: 'number', default: 0},
      {name: 'lineAnchor', type: 'string', values: ['begin', 'end'], default: 'end'},
      {name: 'avoidBaseMark', type: 'boolean', default: true},
      {name: 'size', type: 'number', array: true, length: [2]},
      {name: 'offset', type: 'number', default: [1]},
      {name: 'sort', type: 'field'},
      {name: 'anchor', type: 'string', default: defaultAnchors},
      {name: 'avoidMarks', type: 'data', array: true},
      {
        name: 'as',
        type: 'string',
        array: true,
        length: Output.length,
        default: Output
      }
    ]
  };

  const prototype = vegaUtil.inherits(Label, vegaDataflow.Transform);

  prototype.transform = function(_, pulse) {
    function modp(param) {
      const p = _[param];
      return vegaUtil.isFunction(p) && pulse.modified(p.fields);
    }

    const mod = _.modified();
    if (!(mod || pulse.changed(pulse.ADD_REM) || Params.some(modp))) return;

    const data = pulse.materialize(pulse.SOURCE).source;
    const labelLayout$$1 = this.value;
    const as = _.as || Output;
    const offset = Array.isArray(_.offset) ? _.offset : Number.isFinite(_.offset) ? [_.offset] : [1];
    const anchor = Array.isArray(_.anchor) ? _.anchor : typeof _.anchor === 'string' ? [_.anchor] : defaultAnchors;
    const numberPositions = Math.max(offset.length, anchor.length);

    // configure layout
    const labels = labelLayout$$1
      .texts(data)
      .sort(_.sort)
      .offset(offset, numberPositions)
      .anchor(anchor, numberPositions)
      .avoidMarks(_.avoidMarks || [])
      .size(_.size)
      .avoidBaseMark(_.avoidBaseMark !== undefined ? _.avoidBaseMark : true)
      .lineAnchor(_.lineAnchor || 'end')
      .markIndex(_.markIndex || 0)
      .padding(_.padding || 0)
      .layout();
    const n = data.length;

    // fill the information of transformed labels back into data
    let l, t;
    for (let i = 0; i < n; i++) {
      l = labels[i];
      t = l.datum;

      t[as[0]] = l.x;
      t[as[1]] = l.y;
      t[as[2]] = l.opacity;
      t[as[3]] = l.align;
      t[as[4]] = l.baseline;
      t[as[5]] = l.originalOpacity;
      t[as[6]] = true;
    }

    return pulse.reflow(mod).modifies(as);
  };

  exports.label = Label;
  exports.BitMap = BitMap;
  exports.labelWidth = labelWidth;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
