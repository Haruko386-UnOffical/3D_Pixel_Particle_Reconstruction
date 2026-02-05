import { parseGIF, decompressFrames } from 'gifuct-js';

export const loadGifFrames = async (file) => {
  const buffer = await file.arrayBuffer();
  
  const gif = parseGIF(buffer);

  const frames = decompressFrames(gif, true);

  return {
    frames, 
    width: gif.lsd.width,
    height: gif.lsd.height
  };
};
export const drawPatch = (ctx, frame, width, height) => {
  const dims = frame.dims;

  const frameImageData = new ImageData(
    new Uint8ClampedArray(frame.patch),
    dims.width,
    dims.height
  );

  ctx.putImageData(frameImageData, dims.left, dims.top);
};