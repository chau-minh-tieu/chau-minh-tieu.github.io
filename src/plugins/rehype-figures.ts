/**
 * Images: alt text is required, and an image alone in its paragraph with a
 * title becomes a numbered figure.
 *
 *   ![The dashboard with the assistant panel open](./screenshot-dashboard.png "The assistant shows the SQL it ran.")
 *
 * The title becomes the caption (HANDOFF.md 6.1). An image whose file name
 * starts with `screenshot-` gets the quiet window frame of the mockup; one
 * starting with `wide-` breaks out of the reading column to the full 956px.
 * A missing alt text fails the build and names the image, and so does an
 * image written as raw HTML (rehypeRawImages, F6): only Markdown images go
 * through Astro's image pipeline, which copies, resizes and strips them.
 *
 * rehypeFigureNumbers runs after the diagrams (rehype-diagrams.ts) and
 * numbers every captioned figure, image or diagram, "Fig. N" in page order.
 */
import type { Element, Root } from 'hast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import { classes, el, isBlank, isElement, text } from './hast.ts';

const SCREENSHOT = /(?:^|\/)screenshot-[^/]*$/;
const WIDE = /(?:^|\/)wide-[^/]*$/;

function frameBar(): Element {
  const dot = () => el('span', { className: ['frame-dot'] });
  return el('div', { className: ['frame-bar'], ariaHidden: 'true' }, [dot(), dot(), dot()]);
}

/**
 * Runs before rehype-raw, while the author's HTML is still raw text: a raw
 * <img> would reach the page unresized, with its metadata, pointing at a file
 * the build never copies.
 */
export const rehypeRawImages: Plugin<[], Root> = () => (tree, file) => {
  visit(tree, (node) => {
    const raw = node as { type: string; value?: unknown };
    if (raw.type === 'raw' && typeof raw.value === 'string' && /<img\b/i.test(raw.value)) {
      file.fail('Raw <img> in the post: use Markdown image syntax, ![Alt text](./image.png)', node);
    }
  });
};

export const rehypeFigures: Plugin<[], Root> = () => (tree, file) => {
  visit(tree, 'element', (node) => {
    if (node.tagName !== 'img') return;
    const alt = node.properties.alt;
    if (typeof alt !== 'string' || alt.trim() === '') {
      file.fail(`Image "${String(node.properties.src)}" needs alt text`, node);
    }
  });

  visit(tree, 'element', (node, index, parent) => {
    if (node.tagName !== 'p' || !parent || index === undefined) return;
    const content = node.children.filter((child) => !isBlank(child));
    const image = content[0];
    if (content.length !== 1 || !isElement(image, 'img')) return;
    const caption = image.properties.title;
    if (typeof caption !== 'string' || caption.trim() === '') return;

    delete image.properties.title;
    const src = String(image.properties.src);
    const screenshot = SCREENSHOT.test(src);
    const className = ['figure'];
    if (screenshot) className.push('figure-frame');
    if (WIDE.test(src)) className.push('figure-wide');
    parent.children[index] = el('figure', { className }, [
      screenshot ? el('div', { className: ['frame'] }, [frameBar(), image]) : image,
      el('figcaption', {}, [text(caption)]),
    ]);
  });
};

/** Numbers every figure with a caption, images and diagrams alike, in page order. */
export const rehypeFigureNumbers: Plugin<[], Root> = () => (tree) => {
  let number = 0;
  visit(tree, 'element', (node) => {
    if (node.tagName !== 'figure' || !classes(node).includes('figure')) return;
    const caption = node.children.find((child) => isElement(child, 'figcaption'));
    if (!isElement(caption, 'figcaption')) return;
    number++;
    caption.children.unshift(el('span', { className: ['figure-num'] }, [text(`Fig. ${number}`)]), text(' '));
  });
};
