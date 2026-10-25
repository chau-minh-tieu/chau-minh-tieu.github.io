/** Small helpers for building and inspecting hast (HTML syntax tree) nodes. */
import type { Element, ElementContent, Nodes, Properties, Text } from 'hast';

export function el(tagName: string, properties: Properties = {}, children: ElementContent[] = []): Element {
  return { type: 'element', tagName, properties, children };
}

export function text(value: string): Text {
  return { type: 'text', value };
}

export function isElement(node: Nodes | undefined, tagName?: string): node is Element {
  return node?.type === 'element' && (tagName === undefined || node.tagName === tagName);
}

/** True for text nodes that hold only whitespace, such as the newlines between blocks. */
export function isBlank(node: Nodes): boolean {
  return node.type === 'text' && node.value.trim() === '';
}

export function classes(node: Element): string[] {
  return node.properties.className ?? [];
}
