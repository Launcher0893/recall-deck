import { computed, defineComponent, h } from 'vue';
import type { VNodeChild } from 'vue';
import type { RootContent } from 'mdast';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import MathFormula from './MathFormula.vue';
import './markdown.css';

const parser = unified().use(remarkParse).use(remarkMath).freeze();

function renderNode(node: RootContent): VNodeChild {
  const children = () => 'children' in node
    ? node.children.map(renderNode)
    : [];

  switch (node.type) {
    case 'text': return node.value;
    case 'paragraph': return h('p', children());
    case 'heading': return h('h' + node.depth, children());
    case 'strong': return h('strong', children());
    case 'emphasis': return h('em', children());
    case 'blockquote': return h('blockquote', children());
    case 'list': return node.ordered
      ? h('ol', { start: node.start ?? undefined }, children())
      : h('ul', children());
    case 'listItem': return h('li', children());
    case 'code': return h('pre', [h('code', node.value)]);
    case 'inlineCode': return h('code', node.value);
    case 'break': return h('br');
    case 'thematicBreak': return h('hr');
    case 'link':
    case 'linkReference': return h('span', children());
    case 'inlineMath':
    case 'math': return h(MathFormula, { source: node.value, displayMode: node.type === 'math' });
    default: return null;
  }
}

export default defineComponent({
  name: 'MarkdownView',
  props: { source: { type: String, required: true } },
  setup(props) {
    const nodes = computed(() => parser.parse(props.source).children);
    return () => h('div', { class: 'markdown' }, nodes.value.map(renderNode));
  },
});
