/**
 * @module sources/SpriteSheetSource
 * Slices a single sprite-sheet image into cells and exposes each cell as a
 * frame. Supports a custom frame order (e.g. to skip cells or ping-pong) and
 * arbitrary padding/margins around cells.
 */

/**
 * @typedef {object} SpriteSheetOptions
 * @property {CanvasImageSource} image - the sprite sheet image/canvas/bitmap
 * @property {number} frameWidth - width of a single cell, in source pixels
 * @property {number} frameHeight - height of a single cell, in source pixels
 * @property {number} [columns] - cells per row (defaults to computed from image width)
 * @property {number} [rows] - number of rows (defaults to computed from image height)
 * @property {number} [padding] - gap between cells, in source pixels
 * @property {number} [margin] - border gap around the whole sheet, in source pixels
 * @property {number[]} [order] - explicit cell-index playback order (defaults to sequential)
 */

export class SpriteSheetSource {
  /** @param {SpriteSheetOptions} options */
  constructor(options) {
    const {
      image,
      frameWidth,
      frameHeight,
      columns,
      rows,
      padding = 0,
      margin = 0,
      order,
    } = options;

    if (!image || !frameWidth || !frameHeight) {
      throw new TypeError(
        "favicon-motion: fromSpriteSheet() requires image, frameWidth, and frameHeight"
      );
    }

    const imgWidth = image.width;
    const imgHeight = image.height;

    const resolvedColumns =
      columns ?? Math.floor((imgWidth - 2 * margin + padding) / (frameWidth + padding));
    const resolvedRows =
      rows ?? Math.floor((imgHeight - 2 * margin + padding) / (frameHeight + padding));

    const totalCells = resolvedColumns * resolvedRows;
    this._cells = new Array(totalCells);
    for (let row = 0; row < resolvedRows; row++) {
      for (let col = 0; col < resolvedColumns; col++) {
        const i = row * resolvedColumns + col;
        this._cells[i] = {
          x: margin + col * (frameWidth + padding),
          y: margin + row * (frameHeight + padding),
          width: frameWidth,
          height: frameHeight,
        };
      }
    }

    this._image = image;
    this._order = order && order.length > 0 ? order : this._cells.map((_, i) => i);
    this.frameCount = this._order.length;
    this.isProcedural = false;
  }

  /**
   * @param {number} index
   * @returns {string}
   */
  getSignature(index) {
    return `sprite:${this._order[index]}`;
  }

  /**
   * @param {import("../rendering/Renderer.js").Renderer} renderer
   * @param {number} index
   */
  render(renderer, index) {
    const cellIndex = this._order[index];
    const cell = this._cells[cellIndex];
    renderer.drawSpriteCell(this._image, cell);
  }

  destroy() {
    this._image = null;
    this._cells = null;
    this._order = null;
  }
}
