import { initScene } from './home/scene';
import { initReel } from './home/reel';
import { initSections } from './home/sections';

export default function initHome(): void {
  initScene();
  initReel();
  initSections();
}
