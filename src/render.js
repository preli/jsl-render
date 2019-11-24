"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
// export let KEY_ATTRIBUTE = "_key";
var lastCreatedRenderer = null;
function refresh() {
    if (lastCreatedRenderer != null) {
        lastCreatedRenderer.refresh();
    }
}
exports.refresh = refresh;
var JSLRender = /** @class */ (function () {
    function JSLRender(container) {
        this.container = container;
        this.repaintScheduled = false;
        lastCreatedRenderer = this;
    }
    JSLRender.prototype.render = function (node) {
        // tslint:disable-next-line: no-console
        console.time("JSL render");
        this.rootNode = node || this.rootNode;
        this.renderVNode(this.container, this.rootNode);
        // tslint:disable-next-line: no-console
        console.timeEnd("JSL render");
    };
    JSLRender.prototype.refresh = function () {
        var _this = this;
        if (this.repaintScheduled) {
            return;
        }
        this.repaintScheduled = true;
        window.requestAnimationFrame(function () {
            if (!_this.repaintScheduled) {
                return;
            }
            _this.repaintScheduled = false;
            _this.render();
        });
    };
    JSLRender.prototype.renderVNode = function (container, node) {
        if (this.renderedVNode == null) {
            this.renderedVNode = this.createNode(container, node);
        }
        else {
            this.renderedVNode = this.updateNode(this.renderedVNode, node);
        }
    };
    JSLRender.prototype.createNode = function (container, node, replaceWith) {
        // console.log("createNode");
        var vnode;
        var isComponent = this.isComponent(node);
        if (isComponent) {
            // we have a component
            if (replaceWith == null && node.onInit) {
                node.onInit.call(node, this);
            }
            vnode = node.render();
        }
        else {
            // we have a vNode
            vnode = this.cloneVNode(node);
        }
        this.sanitize(vnode);
        var dom = vnode.dom = document.createElement(vnode.tag);
        for (var attr in vnode.attr) {
            if (vnode.attr.hasOwnProperty(attr)) {
                this.setAttribute(vnode, node, attr, vnode.attr[attr]);
            }
        }
        if (vnode.children.length > 0) {
            for (var idx = 0; idx < vnode.children.length; idx++) {
                if (vnode.children[idx] != null) {
                    vnode.children[idx] = this.createNode(dom, vnode.children[idx]);
                }
            }
        }
        else {
            if (vnode.raw) {
                dom.innerHTML = vnode.content || "";
            }
            else {
                dom.textContent = vnode.content || "";
            }
        }
        if (isComponent) {
            dom._component = node;
        }
        if (replaceWith != null) {
            container.insertBefore(dom, replaceWith.nextSibling);
            container.removeChild(replaceWith);
        }
        else {
            container.appendChild(dom);
        }
        if (isComponent && node.onCreate) {
            node.onCreate.call(node, vnode);
        }
        return vnode;
    };
    JSLRender.prototype.cloneVNode = function (vnode) {
        return {
            tag: vnode.tag,
            attr: vnode.attr,
            children: __spreadArrays((vnode.children || [])),
            dom: vnode.dom,
            raw: vnode.raw,
            content: vnode.content
        };
    };
    JSLRender.prototype.sanitize = function (vnode) {
        if (!this.isComponent(vnode)) {
            vnode.children = (vnode.children || []).filter(function (c) { return c != null; });
            vnode.attr = vnode.attr || [];
        }
    };
    JSLRender.prototype.isComponent = function (node) {
        return typeof node.render === "function";
    };
    JSLRender.prototype.updateNode = function (renderedNode, node) {
        var vnode;
        var isComponent = this.isComponent(node);
        if (!node) {
            this.callRemoveEvents(renderedNode, true);
        }
        else {
            if (renderedNode.dom._component && node.__proto__ !== renderedNode.dom._component.__proto__) {
                // different type of component is present -> delete and recreate
                this.callRemoveEvents(renderedNode, true);
                var parent_1 = renderedNode.dom.parentElement;
                return this.createNode(parent_1, node, renderedNode.dom);
            }
        }
        if (isComponent) {
            // we have a component
            if (node.hasChanged) {
                if (!node.hasChanged.call(node)) {
                    return renderedNode;
                }
            }
            vnode = node.render();
        }
        else {
            // we have a vNode
            vnode = this.cloneVNode(node);
        }
        this.sanitize(vnode);
        vnode.dom = renderedNode.dom;
        if (isComponent) {
            vnode.dom._component = node;
        }
        if (renderedNode.tag !== vnode.tag) {
            // tag changed -> delete and recreate
            this.callRemoveEvents(renderedNode, true);
            var parent_2 = renderedNode.dom.parentElement;
            return this.createNode(parent_2, node, renderedNode.dom);
        }
        var attributesChanged = false;
        if (!this.areAttributesEqual(renderedNode, vnode)) {
            this.updateAttributes(renderedNode, vnode, node);
            attributesChanged = true;
        }
        var contentChanged = this.updateContent(renderedNode, vnode);
        if ((contentChanged || attributesChanged) && isComponent && node.onUpdate) {
            node.onUpdate.call(node, vnode);
        }
        return vnode;
    };
    JSLRender.prototype.updateContent = function (renderedNode, vnode) {
        if (renderedNode.children.length !== vnode.children.length ||
            renderedNode.content !== vnode.content) {
            if (vnode.children.length > 0) {
                this.callRemoveEvents(renderedNode);
                vnode.dom.innerHTML = ""; // TODO -> better solution (?)
                for (var idx = 0; idx < vnode.children.length; idx++) {
                    vnode.children[idx] = this.createNode(vnode.dom, vnode.children[idx]);
                }
            }
            else {
                if (vnode.raw) {
                    vnode.dom.innerHTML = vnode.content || "";
                }
                else {
                    vnode.dom.textContent = vnode.content || "";
                }
            }
            return true;
        }
        else {
            for (var idx = 0; idx < renderedNode.children.length; idx++) {
                vnode.children[idx] = this.updateNode(renderedNode.children[idx], vnode.children[idx]);
            }
            return false;
        }
    };
    JSLRender.prototype.updateAttributes = function (renderedNode, vnode, node) {
        // clear previous rendered attributes
        for (var oldAttr in renderedNode.attr) {
            if (renderedNode.attr.hasOwnProperty(oldAttr)) {
                if (typeof renderedNode.attr[oldAttr] === "function" &&
                    renderedNode.attr[oldAttr] !== vnode.attr[oldAttr]) {
                    renderedNode.dom.removeEventListener(oldAttr, renderedNode.dom["_" + oldAttr + "_"]);
                }
                else {
                    if (vnode.attr[oldAttr] === undefined) {
                        renderedNode.dom.removeAttribute(oldAttr);
                    }
                }
            }
        }
        // set new attributes
        for (var attr in vnode.attr) {
            if (vnode.attr.hasOwnProperty(attr)) {
                this.setAttribute(vnode, node, attr, vnode.attr[attr]);
            }
        }
    };
    JSLRender.prototype.setAttribute = function (vnode, node, attr, value) {
        var _this = this;
        if (typeof vnode.attr[attr] === "function") {
            var eventHandler = function (args) {
                var closestComponent = args.currentTarget;
                var component;
                // tslint:disable-next-line: no-conditional-assignment
                while (!(component = closestComponent._component)) {
                    closestComponent = closestComponent.parentElement;
                    if (closestComponent == null) {
                        break;
                    }
                }
                if (value.call(component || node, args, vnode) !== false) {
                    _this.refresh();
                }
            };
            vnode.dom.addEventListener(attr, eventHandler);
            vnode.dom["_" + attr + "_"] = eventHandler;
        }
        else {
            vnode.dom.setAttribute(attr, value);
        }
    };
    JSLRender.prototype.callRemoveEvents = function (vnode, includeOwnTag) {
        for (var idx = 0; idx < vnode.children.length; idx++) {
            var cnode = vnode.children[idx];
            if (cnode && cnode.dom) {
                execute(cnode);
                this.callRemoveEvents(cnode);
            }
        }
        if (includeOwnTag && vnode.dom) {
            execute(vnode);
        }
        function execute(node) {
            var component = node.dom._component;
            if (component && component.onRemove) {
                component.onRemove.call(component, {
                    container: node.dom.parentElement,
                    dom: node.dom,
                    node: node
                });
            }
        }
    };
    JSLRender.prototype.areAttributesEqual = function (nodeA, nodeB) {
        for (var attribute in nodeA.attr) {
            if (nodeA.attr.hasOwnProperty(attribute)) {
                if (nodeB.attr.hasOwnProperty(attribute)) {
                    if (nodeA.attr[attribute] !== nodeB.attr[attribute]) {
                        return false;
                    }
                }
                else {
                    return false;
                }
            }
        }
        // check for attributes present in nodeB but not in nodeA
        for (var attribute in nodeB.attr) {
            if (nodeB.attr.hasOwnProperty(attribute) && !nodeA.attr.hasOwnProperty(attribute)) {
                return false;
            }
        }
        return true;
    };
    return JSLRender;
}());
exports.JSLRender = JSLRender;
