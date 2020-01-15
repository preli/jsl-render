import { IJSLComponent, IJSLVNode } from "./interfaces";

let lastCreatedRenderer: JSLRender = null;

const MaxReorderChildren = 1000;

export function refresh() {
    if (lastCreatedRenderer != null) {
        lastCreatedRenderer.refresh();
    }
}

function isFnc(f: any): boolean {
    return typeof f === "function";
}

function isComponent(node: IJSLVNode | IJSLComponent): boolean {
    return node != null && isFnc((node as any).render);
}

function areEqual(a: IJSLComponent, b: IJSLComponent): boolean {
    if (b.isEqual != null) {
        return b.isEqual(a);
    }
    return a === b;
    // return (a as any).__proto__ !== (b as any).__proto__;
}

function swapDomElements(obj1: Element, obj2: Element) {
    // save the location of obj2
    const parent2 = obj2.parentElement;
    const next2 = obj2.nextElementSibling;
    // special case for obj1 is the next sibling of obj2
    if (next2 === obj1) {
        // just put obj1 before obj2
        parent2.insertBefore(obj1, obj2);
    } else {
        // insert obj2 right before obj1
        obj1.parentNode.insertBefore(obj2, obj1);

        // now insert obj1 where obj2 was
        if (next2) {
            // if there was an element after obj2, then insert obj1 right before that
            parent2.insertBefore(obj1, next2);
        } else {
            // otherwise, just append as last child
            parent2.appendChild(obj1);
        }
    }
}

function findComponentIdx(children: IJSLVNode[], component: IJSLComponent): number {
    for (let i = 0; i < children.length; i++) {
        if ((children[i].dom as any)._component === component) {
            return i;
        }
    }
    return -1;
}

function switchChildren(newIdx, oldIdx, node: IJSLVNode): void {
    while (node.children.length <= newIdx) {
        // newIdx is outside of bounds of node.children
        const dummyDom = document.createElement("span");
        node.dom.appendChild(dummyDom);
        node.dom.insertBefore(dummyDom, node.dom.children[oldIdx]);
        node.children.splice(oldIdx, 0, { tag: "span", dom: dummyDom, children: [] });
        oldIdx++;
    }
    if (oldIdx === newIdx) {
        return;
    }

    swapDomElements(node.dom.children[newIdx], node.dom.children[oldIdx]);

    // switch in node.children as well (not just in DOM)
    const tmp = node.children[oldIdx];
    node.children[oldIdx] = node.children[newIdx];
    node.children[newIdx] = tmp;
}

export class JSLRender {

    private renderedVNode: IJSLVNode;

    private rootNode: IJSLVNode | IJSLComponent;

    private repaintScheduled = false;

    constructor(private container: HTMLElement, globalRefresh?: boolean) {
        if (globalRefresh) {
            lastCreatedRenderer = this;
        }
    }

    public render(node?: IJSLVNode | IJSLComponent): void {
        // tslint:disable-next-line: no-console
        console.time("JSL render");
        this.rootNode = node || this.rootNode;
        this.renderVNode(this.container, this.rootNode);
        // tslint:disable-next-line: no-console
        console.timeEnd("JSL render");
    }

    public refresh(): void {
        if (this.repaintScheduled) {
            return;
        }
        this.repaintScheduled = true;
        window.requestAnimationFrame(() => {
            if (!this.repaintScheduled) {
                return;
            }
            this.repaintScheduled = false;
            this.render();
        });
    }

    private renderVNode(container: HTMLElement, node: IJSLVNode | IJSLComponent): void {
        if (this.renderedVNode == null) {
            this.renderedVNode = this.createNode(container, node);
        } else {
            this.renderedVNode = this.updateNode(this.renderedVNode, node);
        }
    }

    private createNode(container: HTMLElement, node: IJSLVNode | IJSLComponent, replaceWith?: HTMLElement): IJSLVNode {
        // console.log("createNode");
        let vnode: IJSLVNode;
        const isComp = isComponent(node);
        if (isComp) {
            // we have a component
            if ((node as IJSLComponent).onInit) { // if (replaceWith == null && (node as IJSLComponent).onInit) {
                (node as IJSLComponent).onInit.call(node, this);
            }
            vnode = (node as IJSLComponent).render();
        } else {
            // we have a vNode
            vnode = this.cloneVNode(node as IJSLVNode);
        }
        this.sanitize(vnode);
        const dom = vnode.dom = document.createElement(vnode.tag);
        for (const attr in vnode.attr) {
            if (vnode.attr.hasOwnProperty(attr)) {
                this.setAttribute(vnode, node, attr);
            }
        }
        if (vnode.children.length > 0) {
            for (let idx = 0; idx < vnode.children.length; idx++) {
                if (vnode.children[idx] != null) {
                    vnode.children[idx] = this.createNode(dom, vnode.children[idx]);
                }
            }
        } else {
            if (vnode.raw) {
                dom.innerHTML = vnode.content || "";
            } else {
                dom.textContent = vnode.content || "";
            }
        }
        if (isComp) {
            (dom as any)._component = node;
        }
        if (replaceWith != null) {
            container.insertBefore(dom, replaceWith.nextSibling);
            container.removeChild(replaceWith);
        } else {
            container.appendChild(dom);
        }
        if (isComp && (node as IJSLComponent).onCreate) {
            (node as IJSLComponent).onCreate.call(node, vnode);
        }
        return vnode;
    }

    private cloneVNode(vnode: IJSLVNode): IJSLVNode {
        return {
            tag: vnode.tag,
            attr: { ...vnode.attr },
            children: (vnode.children || []).slice(),
            dom: vnode.dom,
            raw: vnode.raw,
            content: vnode.content
        };
    }

    private sanitize(vnode: IJSLVNode) {
        if (!isComponent(vnode)) {
            vnode.children = (vnode.children || []).filter((c) => c != null);
            vnode.attr = vnode.attr || [];
        }
    }

    private updateNode(renderedNode: IJSLVNode, node: IJSLVNode | IJSLComponent): IJSLVNode {
        if (renderedNode.dom.parentElement == null) {
            // does not exist anymore
            // -> was probably modified outside of jsl-render code
            // -> needs to be removed now, so return undefined
            return;
        }

        let vnode: IJSLVNode;
        const isComp = isComponent(node);
        {
            const oldComponent = (renderedNode.dom as any)._component;
            const isOldNodeAComponent = oldComponent != null;
            if (isOldNodeAComponent || isComp) {
                let recreateNode = false;
                if (!isComp || !isOldNodeAComponent) {
                    recreateNode = true;
                } else {
                    // we had a component in last render cycle and we still have a component
                    // ... but is it the same component or do we need to recreate it
                    if (!areEqual(node as IJSLComponent, oldComponent)) {
                        recreateNode = true;
                    }
                }
                if (recreateNode) {
                    this.callRemoveEvents(renderedNode, true);
                    const parent = renderedNode.dom.parentElement;
                    return this.createNode(parent, node, renderedNode.dom);
                }
            }
        }

        if (isComp) {
            vnode = (node as IJSLComponent).render();
        } else {
            // we have a vNode
            vnode = this.cloneVNode(node as IJSLVNode);
        }
        this.sanitize(vnode);
        vnode.dom = renderedNode.dom;
        // if (isComp) {
        (vnode.dom as any)._component = isComp ? node : undefined;
        // }

        if (renderedNode.tag !== vnode.tag || renderedNode.raw !== vnode.raw) {
            // tag changed -> delete and recreate
            this.callRemoveEvents(renderedNode, true);
            const parent = renderedNode.dom.parentElement;
            return this.createNode(parent, node, renderedNode.dom);
        }

        const attributesChanged = this.updateAttributes(renderedNode, vnode, node);
        // let attributesChanged = false;
        // if (!this.areAttributesEqual(renderedNode, vnode)) {
        //     this.updateAttributes(renderedNode, vnode, node);
        //     attributesChanged = true;
        // } else {
        //     this.refreshHandlers(renderedNode, vnode, node);
        // }
        const contentChanged = this.updateContent(renderedNode, vnode);
        if ((contentChanged || attributesChanged) && isComp && (node as IJSLComponent).onUpdate) {
            (node as IJSLComponent).onUpdate.call(node, vnode);
        }
        return vnode;
    }


    // private refreshHandlers(renderedNode: IJSLVNode, vnode: IJSLVNode, node: IJSLVNode | IJSLComponent) {
    //     for (const attr in vnode.attr) {
    //         if (isFnc(vnode.attr[attr]) &&
    //             renderedNode.attr[attr] !== vnode.attr[attr]) {
    //             if (renderedNode.dom["_" + attr + "_"] != null) {
    //                 renderedNode.dom.removeEventListener(attr, renderedNode.dom["_" + attr + "_"]);
    //             }
    //             this.setAttribute(vnode, node, attr);
    //         }
    //     }
    // }

    private updateContent(renderedNode: IJSLVNode, vnode: IJSLVNode): boolean {
        this.tryToReorderChildren(renderedNode, vnode);
        if (renderedNode.children.length !== vnode.children.length ||
            renderedNode.content !== vnode.content) {
            if (renderedNode.children.length > 0) {
                this.callRemoveEvents(renderedNode);
            }
            if (vnode.children.length > 0) {
                vnode.dom.innerHTML = "";
                for (let idx = 0; idx < vnode.children.length; idx++) {
                    vnode.children[idx] = this.createNode(vnode.dom, vnode.children[idx]);
                }
            } else {
                if (vnode.raw) {
                    vnode.dom.innerHTML = vnode.content || "";
                } else {
                    vnode.dom.textContent = vnode.content || "";
                }
            }
            return true;
        } else {
            const newChildren = [];
            for (let idx = 0; idx < renderedNode.children.length; idx++) {
                const tmp = this.updateNode(renderedNode.children[idx] as IJSLVNode, vnode.children[idx]);
                if (tmp != null) {
                    newChildren.push(tmp);
                }
            }
            vnode.children = newChildren;
            return false;
        }
    }

    private tryToReorderChildren(renderedNode: IJSLVNode, vnode: IJSLVNode): void {
        if (renderedNode.children.length > 0 && vnode.children.length > 0 && vnode.children.length <= MaxReorderChildren) {
            let idx: number;
            let l: number;
            let anyMatchesFound = false;
            for (idx = 0, l = vnode.children.length; idx < l; idx++) {
                const c = vnode.children[idx];
                if (isComponent(c)) {
                    let oldCompIdx = idx;
                    if ((renderedNode.children[oldCompIdx] as any)?.dom?._component !== c) {
                        oldCompIdx = findComponentIdx(renderedNode.children as IJSLVNode[], c as IJSLComponent);
                    }
                    if (oldCompIdx >= 0) { // found
                        if (oldCompIdx !== idx) {
                            switchChildren(idx, oldCompIdx, renderedNode);
                        }
                        anyMatchesFound = true;
                    }
                } else {
                    // TODO? -> support reordering for Vnodes as well?
                }
            }
            if (anyMatchesFound) {
                if (l < renderedNode.children.length) {
                    // dispose everything that is "left" and shorten renderedNode.children array to size l
                    for (let i = l; i < renderedNode.children.length; i++) {
                        this.callRemoveEvents(renderedNode.children[i] as IJSLVNode, true);
                        const dom = (renderedNode.children[i] as IJSLVNode).dom;
                        if (dom != null && dom.parentElement != null) {
                            dom.parentElement.removeChild(dom);
                        }
                    }
                    renderedNode.children.length = l;
                } else if (l > renderedNode.children.length) {
                    // add dummy nodes to make renderedNode same size
                    for (let i = renderedNode.children.length; i < l; i++) {
                        const dummyDom = document.createElement("span");
                        renderedNode.children.push({ tag: "span", dom: dummyDom, children: [] });
                        renderedNode.dom.appendChild(dummyDom);
                    }
                }
            }
        }
    }

    private callRemoveEvents(vnode: IJSLVNode, includeOwnTag?: boolean) {
        for (let idx = 0; idx < vnode.children.length; idx++) {
            const cnode: IJSLVNode = vnode.children[idx] as IJSLVNode;
            if (cnode && (cnode as IJSLVNode).dom) {
                execute(cnode);
                this.callRemoveEvents(cnode);
            }
        }

        if (includeOwnTag && (vnode as IJSLVNode).dom) {
            execute(vnode);
        }

        function execute(node: IJSLVNode) {
            const component: IJSLComponent = (node.dom as any)._component;
            if (component && component.onRemove) {
                component.onRemove.call(component, {
                    container: node.dom.parentElement,
                    dom: node.dom,
                    node
                });
            }
        }
    }

    private updateAttributes(rendered: IJSLVNode, vnode: IJSLVNode, node: IJSLVNode | IJSLComponent): boolean {
        let result = false;
        for (const attribute in vnode.attr) {
            if (vnode.attr.hasOwnProperty(attribute) && vnode.attr[attribute] !== rendered.attr[attribute]) {
                if (isFnc(rendered.attr[attribute])) {
                    if (rendered.dom["_" + attribute + "_"] != null) {
                        rendered.dom.removeEventListener(attribute, rendered.dom["_" + attribute + "_"]);
                    }
                } else {
                    result = true;
                }
                this.setAttribute(vnode, node, attribute);
            }
        }
        // check for attributes present in rendered but not in vnode (new node)
        for (const attribute in rendered.attr) {
            if (rendered.attr.hasOwnProperty(attribute) && !vnode.attr.hasOwnProperty(attribute)) {
                if (isFnc(rendered.attr[attribute])) {
                    if (rendered.dom["_" + attribute + "_"] != null) {
                        rendered.dom.removeEventListener(attribute, rendered.dom["_" + attribute + "_"]);
                    }
                } else {
                    rendered.dom.removeAttribute(attribute);
                    result = true;
                }
            }
        }
        return result;
    }

    private setAttribute(vnode: IJSLVNode, node: IJSLComponent | IJSLVNode, attr: string) {
        if (isFnc(vnode.attr[attr])) {
            const eventHandler = (args) => {
                let closestComponent = args.currentTarget;
                let component;
                // tslint:disable-next-line: no-conditional-assignment
                while (!(component = closestComponent._component)) {
                    closestComponent = closestComponent.parentElement;
                    if (closestComponent == null) {
                        break;
                    }
                }
                const fnc = vnode.attr[attr];
                if (fnc != null) {
                    if (fnc.call(component || node, args, vnode) !== false) {
                        this.refresh();
                    }
                } else { // this should probably not happen anyway
                    vnode.dom.removeEventListener(attr, eventHandler);
                }
            };
            vnode.dom.addEventListener(attr, eventHandler);
            vnode.dom["_" + attr + "_"] = eventHandler;
        } else {
            if (vnode.attr[attr] != null) {
                vnode.dom.setAttribute(attr, vnode.attr[attr]);
            } else {
                vnode.dom.removeAttribute(attr);
            }
        }
    }

}
