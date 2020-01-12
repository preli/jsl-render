import { IJSLComponent, IJSLVNode } from "./interfaces";

let lastCreatedRenderer: JSLRender = null;

export function refresh() {
    if (lastCreatedRenderer != null) {
        lastCreatedRenderer.refresh();
    }
}

function isFnc(f: any): boolean {
    return typeof f === "function";
}

function isComponent(node: IJSLVNode | IJSLComponent): boolean {
    return isFnc((node as any).render);
}

function areEqual(a: IJSLComponent, b: IJSLComponent): boolean {
    if (b.isEqual != null) {
        return b.isEqual(a);
    }
    return a === b;
    // return (a as any).__proto__ !== (b as any).__proto__;
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
            attr: vnode.attr,
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
        // if (!node) {
        //     debugger;
        //     this.callRemoveEvents(renderedNode, true);
        //     renderedNode.dom.parentElement.removeChild(renderedNode.dom);
        //     return;
        // }

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

        if (renderedNode.tag !== vnode.tag) {
            // tag changed -> delete and recreate
            this.callRemoveEvents(renderedNode, true);
            const parent = renderedNode.dom.parentElement;
            return this.createNode(parent, node, renderedNode.dom);
        }

        let attributesChanged = false;
        if (!this.areAttributesEqual(renderedNode, vnode)) {
            this.updateAttributes(renderedNode, vnode, node);
            attributesChanged = true;
        } else {
            this.refreshHandlers(renderedNode, vnode, node);
        }
        const contentChanged = this.updateContent(renderedNode, vnode);
        if ((contentChanged || attributesChanged) && isComp && (node as IJSLComponent).onUpdate) {
            (node as IJSLComponent).onUpdate.call(node, vnode);
        }
        return vnode;
    }


    private refreshHandlers(renderedNode: IJSLVNode, vnode: IJSLVNode, node: IJSLVNode | IJSLComponent) {
        for (const attr in vnode.attr) {
            if (isFnc(vnode.attr[attr]) &&
                renderedNode.attr[attr] !== vnode.attr[attr]) {
                if (renderedNode.dom["_" + attr + "_"] != null) {
                    renderedNode.dom.removeEventListener(attr, renderedNode.dom["_" + attr + "_"]);
                }
                this.setAttribute(vnode, node, attr);
            }
        }
    }

    private updateContent(renderedNode: IJSLVNode, vnode: IJSLVNode): boolean {
        this.tryToReorderChildren(renderedNode, vnode);
        if (renderedNode.children.length !== vnode.children.length ||
            renderedNode.content !== vnode.content) {
            if (vnode.children.length > 0) {
                this.callRemoveEvents(renderedNode);
                vnode.dom.innerHTML = ""; // TODO -> better solution (?)
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

        function findComponentIdx(children: IJSLVNode[], component: IJSLComponent): number {
            for (let i = 0; i < children.length; i++) {
                if ((children[i].dom as any)?._component === component) {
                    return i;
                }
                return -1;
            }
        }

        function switchDom(newIdx, oldIdx, node: IJSLVNode): void {
            // TODO: what if newIdx is outside of bounds of node.dom.children
            node.dom.children[newIdx].parentNode.insertBefore(node.dom.children[newIdx], node.dom.children[oldIdx]);
        }

        if (renderedNode.children.length > 0 && vnode.children.length > 0) {
            for (let idx = 0, l = vnode.children.length; idx < l; idx++) {
                const c = vnode.children[l];
                if (isComponent(c)) {
                    const oldCompIdx = findComponentIdx(renderedNode.children as IJSLVNode[], c as IJSLComponent);
                    if (oldCompIdx >= 0) { // found
                        switchDom(idx, oldCompIdx, renderedNode);
                    }
                } else {
                    // TODO
                }
            }
        }
    }

    private updateAttributes(renderedNode: IJSLVNode, vnode: IJSLVNode, node: IJSLVNode | IJSLComponent) {
        // clear previous rendered attributes
        for (const oldAttr in renderedNode.attr) {
            if (renderedNode.attr.hasOwnProperty(oldAttr)) {
                if (isFnc(renderedNode.attr[oldAttr]) &&
                    renderedNode.attr[oldAttr] !== vnode.attr[oldAttr]) {
                    renderedNode.dom.removeEventListener(oldAttr, renderedNode.dom["_" + oldAttr + "_"]);
                    renderedNode.dom["_" + oldAttr + "_"] = undefined;
                } else {
                    if (vnode.attr[oldAttr] === undefined) {
                        renderedNode.dom.removeAttribute(oldAttr);
                    }
                }
            }
        }
        // set new attributes
        for (const attr in vnode.attr) {
            if (vnode.attr.hasOwnProperty(attr)) {
                this.setAttribute(vnode, node, attr);
            }
        }
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
                if (vnode.attr[attr].call(component || node, args, vnode) !== false) {
                    this.refresh();
                }
            };
            vnode.dom.addEventListener(attr, eventHandler);
            vnode.dom["_" + attr + "_"] = eventHandler;
        } else {
            vnode.dom.setAttribute(attr, vnode.attr[attr]);
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

    private areAttributesEqual(nodeA: IJSLVNode, nodeB: IJSLVNode): boolean {
        for (const attribute in nodeA.attr) {
            if (nodeA.attr.hasOwnProperty(attribute)) {
                if (nodeB.attr.hasOwnProperty(attribute)) {
                    if ((!isFnc(nodeA.attr[attribute]) || !isFnc(nodeB.attr[attribute])) // both values are a function (handlers)-> no need to update
                        && nodeA.attr[attribute] !== nodeB.attr[attribute]) {
                        return false;
                    }
                } else {
                    return false;
                }
            }
        }
        // check for attributes present in nodeB but not in nodeA
        for (const attribute in nodeB.attr) {
            if (nodeB.attr.hasOwnProperty(attribute) && !nodeA.attr.hasOwnProperty(attribute)) {
                return false;
            }
        }
        return true;
    }

}
