import { Howl } from "howler";

const sounds = {
  copy: new Howl({ src: ["/sounds/copy.wav"], volume: 1 }),
  paste: new Howl({ src: ["/sounds/paste.wav"], volume: 1 }),
};

export const playSound = (type) => {
  const sound = sounds[type];
  if (sound) {
    sound.stop(); // reset ulang kalau masih bunyi
    sound.play();
  }
};
