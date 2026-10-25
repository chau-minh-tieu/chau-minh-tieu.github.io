/**
 * Images: alt text is required, and an image alone in its paragraph with a
 * title becomes a numbered figure.
 *
 *   ![The dashboard with the assistant panel open](./screenshot-dashboard.png "The assistant shows the SQL it ran.")
 *
 * The title becomes the caption, "Fig. N" (HANDOFF.md 6.1). An image whose
 * file name starts with `screenshot-` gets the quiet window frame of the
 * mockup. A missing alt text fails the build and names the image.
 */
import type { Element, Root } from 'hast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import { el, isBlank, isElement, text } from './hast.ts';

const SCREENSHOT = /(?:^|\/)screenshot-[^/]*$/;

function frameBar(): Element {
  const dot = () => el('span', { className: ['frame-dot'] });
  return el('div', { className: ['frame-bar'], ariaHidden: 'true' }, [dot(), dot(), dot()]);
}

export const rehypeFigures: Plugin<[], Root> = () => (tree, file) => {
  visit(tree, 'element', (node) => {
    if (node.tagName !== 'img') return;
    const alt = node.properties.alt;
    if (typeof alt !== 'string' || alt.trim() === '') {
      file.fail(`Image "${String(node.properties.src)}" needs alt text`, node);
    }
  });

  let number = 0;
  visit(tree, 'element', (node, index, parent) => {
    if (node.tagName !== 'p' || !parent || index === undefined) return;
    const content = node.children.filter((child) => !isBlank(child));
    const image = content[0];
    if (content.length !== 1 || !isElement(image, 'img')) return;
    const caption = image.properties.title;
    if (typeof caption !== 'string' || caption.trim() === '') return;

    delete image.properties.title;
    number++;
    const screenshot = SCREENSHOT.test(String(image.properties.src));
    parent.children[index] = el('figure', { className: screenshot ? ['figure', 'figure-frame'] : ['figure'] }, [
      screenshot ? el('div', { className: ['frame'] }, [frameBar(), image]) : image,
      el('figcaption', {}, [el('span', { className: ['figure-num'] }, [text(`Fig. ${number}`)]), text(` ${caption}`)]),
    ]);
  });
};
