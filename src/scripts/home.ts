import { initScene } from './home/scene';
import { initReel } from './home/reel';
import { initSections } from './home/sections';

// Yield between setups so the page can answer input while the scroll scenes wire up.
const yieldToMain = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export default async function initHome(): Promise<void> {
  initScene();
  await yieldToMain();
  initReel();
  await yieldToMain();
  initSections();
}
