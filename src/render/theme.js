/**
 * One farm's worth of colour. The world is lit rather than drawn in lines
 * now, so these are pigments — what a thing is made of — and the lighting in
 * `daylight.js` decides how bright any of it ends up.
 */
export const THEME = {
  /** Sky, and the haze the far end of the field dissolves into. */
  sky: 0x74b7e6,
  high: 0x3d8fd0,
  haze: 0xcfe0e0,
  sun: 0xfff2cf,

  /** Ground. Tilled on top, cut earth down the sides, grass round the rim. */
  soil: 0x7a5636,
  earth: 0x6a4a2e,
  furrow: 0x5d4128,
  grass: 0x6fa243,
  meadow: 0x7aa848,

  /** Timber, straw and the twine that holds a bale together. */
  wood: 0xa9793f,
  post: 0x8a6132,
  straw: 0xd9b45c,
  chaff: 0xb68f38,
  twine: 0x6f5f3a,
  barn: 0xb2402d,
  sack: 0xc8ac7d,

  /** The quilt of fields a long way below the plot you are standing on. */
  quilt: [0x6d9a44, 0x86ad4c, 0x5c8a3c, 0xc0a950, 0x8d6a42, 0x77a04a, 0xa88c49],
  hedge: 0x4a6b33,

  shadow: 0x3a2716,
};

/** The produce in the ground, a kind at a time. `course.js` picks the kind;
 *  this says what it is made of. */
export const PRODUCE = [
  { name: 'carrot', body: 0xe8752a, trim: 0x5fa03a },
  { name: 'corn', body: 0xf2c93f, trim: 0x79ab3d },
  { name: 'tomato', body: 0xe0402f, trim: 0x4f9337 },
  { name: 'pumpkin', body: 0xe2812a, trim: 0x6d5a2c },
  { name: 'aubergine', body: 0x71499b, trim: 0x53913a },
  { name: 'apple', body: 0xc32a34, trim: 0x5fa03a },
];

export const CSS = {
  cream: '#fff6e2',
  barn: '#b2402d',
  grass: '#6fa243',
};
