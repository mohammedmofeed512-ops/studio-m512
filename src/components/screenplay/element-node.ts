import { Extension, Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";
import {
  ELEMENT_KINDS,
  NEXT_ON_ENTER,
  pageBreaks,
  sceneNumberFor,
  looksLikeSceneHeading,
  nextOnTab,
  type ElementKind,
} from "@/lib/screenplay/model";

const uid = () => crypto.randomUUID();

/** A screenplay document is a flat list of element lines. */
export const ScreenplayDocument = Node.create({
  name: "doc",
  topNode: true,
  content: "element+",
});

/** One screenplay line; `kind` decides its layout, scene headings carry a stable `sceneId`. */
export const ElementNode = Node.create({
  name: "element",
  group: "block",
  content: "text*",
  marks: "",
  defining: true,

  addAttributes() {
    return {
      kind: {
        default: "action" as ElementKind,
        parseHTML: (el) => (ELEMENT_KINDS as readonly string[]).includes(el.getAttribute("data-kind") ?? "") ? el.getAttribute("data-kind") : "action",
        renderHTML: (attrs) => ({ "data-kind": attrs.kind }),
      },
      sceneId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-scene-id"),
        renderHTML: (attrs) => (attrs.sceneId ? { "data-scene-id": attrs.sceneId } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "p[data-kind]" }, { tag: "p", attrs: { kind: "action" } }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["p", mergeAttributes(HTMLAttributes, { class: "sp-el" }), 0];
  },

  addProseMirrorPlugins() {
    // Every scene heading gets a unique id (new headings, split headings, pasted headings);
    // other lines drop theirs. Ids keep breakdowns and shots attached as the script changes.
    return [
      new Plugin({
        key: new PluginKey("sceneIds"),
        appendTransaction: (trs, _old, state) => {
          if (!trs.some((tr) => tr.docChanged)) return null;
          const seen = new Set<string>();
          let tr = state.tr;
          let changed = false;
          state.doc.forEach((node, pos) => {
            if (node.type.name !== "element") return;
            const { kind, sceneId } = node.attrs as { kind: ElementKind; sceneId: string | null };
            if (kind === "sceneHeading") {
              if (!sceneId || seen.has(sceneId)) {
                const id = uid();
                tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, sceneId: id });
                seen.add(id);
                changed = true;
              } else seen.add(sceneId);
            } else if (sceneId) {
              tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, sceneId: null });
              changed = true;
            }
          });
          return changed ? tr.setMeta("addToHistory", false) : null;
        },
      }),
      new Plugin({
        key: new PluginKey("screenplayLayout"),
        props: { decorations: (state) => layoutDecorations(state.doc) },
      }),
    ];
  },
});

/** Scene numbers in both margins of each heading, and a marker where each printed page starts. */
function layoutDecorations(doc: PMNode) {
  const nodes: Array<{ pos: number; node: PMNode }> = [];
  doc.forEach((node, pos) => nodes.push({ pos, node }));
  const decos: Decoration[] = [];
  let scene = 0;
  for (const { pos, node } of nodes) {
    if (node.attrs.kind === "sceneHeading" && node.textContent.trim()) {
      scene += 1;
      decos.push(Decoration.node(pos, pos + node.nodeSize, { "data-scene-number": sceneNumberFor(node.textContent, scene) }));
    }
  }
  const breaks = pageBreaks(nodes.map(({ node }) => ({ kind: node.attrs.kind as ElementKind, text: node.textContent })));
  breaks.forEach((index, i) => {
    const page = i + 2;
    decos.push(
      Decoration.widget(
        nodes[index].pos,
        () => {
          const el = document.createElement("div");
          el.className = "sp-pagebreak";
          el.setAttribute("contenteditable", "false");
          el.setAttribute("data-page", `${page}.`);
          return el;
        },
        { side: -1, key: `page-${page}`, ignoreSelection: true },
      ),
    );
  });
  return DecorationSet.create(doc, decos);
}

function currentElement(editor: import("@tiptap/core").Editor) {
  const { $from } = editor.state.selection;
  const node = $from.node($from.depth);
  return node.type.name === "element" ? node : null;
}

export function setKind(editor: import("@tiptap/core").Editor, kind: ElementKind) {
  return editor.chain().focus().updateAttributes("element", { kind }).run();
}

/** Final Draft-style keys: Enter picks the next element, Tab cycles the current one, Mod-1…6 set it. */
export const ScreenplayKeys = Extension.create({
  name: "screenplayKeys",

  addKeyboardShortcuts() {
    const shortcuts: Record<string, (props: { editor: import("@tiptap/core").Editor }) => boolean> = {
      Enter: ({ editor }) => {
        const node = currentElement(editor);
        if (!node) return false;
        const kind = node.attrs.kind as ElementKind;
        const text = node.textContent.trim();

        // Enter on an empty line changes its kind instead of adding another empty line.
        if (!text) return setKind(editor, nextOnTab(kind));

        let effective = kind;
        if (kind === "action" && looksLikeSceneHeading(text)) {
          effective = "sceneHeading";
          editor.commands.updateAttributes("element", { kind: effective });
        }
        const { $from, empty } = editor.state.selection;
        const atEnd = empty && $from.parentOffset === $from.parent.content.size;
        if (!atEnd) return editor.chain().splitBlock().run();
        return editor.chain().splitBlock().updateAttributes("element", { kind: NEXT_ON_ENTER[effective] }).run();
      },
      "Shift-Enter": ({ editor }) => editor.chain().splitBlock().run(),
      Tab: ({ editor }) => {
        const node = currentElement(editor);
        return node ? setKind(editor, nextOnTab(node.attrs.kind)) : false;
      },
      "Shift-Tab": ({ editor }) => {
        const node = currentElement(editor);
        return node ? setKind(editor, nextOnTab(node.attrs.kind, true)) : false;
      },
      Backspace: ({ editor }) => {
        // Backspace at the start of an empty non-action line turns it into action first.
        const node = currentElement(editor);
        const { $from, empty } = editor.state.selection;
        if (node && empty && !node.textContent && $from.parentOffset === 0 && node.attrs.kind !== "action") return setKind(editor, "action");
        return false;
      },
    };
    ELEMENT_KINDS.forEach((kind, i) => {
      shortcuts[`Mod-${i + 1}`] = ({ editor }) => setKind(editor, kind);
    });
    return shortcuts;
  },
});

/** Moves the cursor to the start of a scene heading and scrolls it into view. */
export function goToScene(editor: import("@tiptap/core").Editor, sceneId: string) {
  let target = -1;
  editor.state.doc.forEach((node, pos) => {
    if (target < 0 && node.attrs.sceneId === sceneId) target = pos + 1;
  });
  if (target < 0) return;
  const tr = editor.state.tr.setSelection(TextSelection.create(editor.state.doc, target)).scrollIntoView();
  editor.view.dispatch(tr);
  editor.view.focus();
  const dom = editor.view.domAtPos(target).node as HTMLElement;
  (dom.nodeType === 1 ? dom : dom.parentElement)?.scrollIntoView({ block: "center", behavior: "smooth" });
}
