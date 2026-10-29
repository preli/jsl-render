import { h, IJSLVNode, JSLAttributes } from "jsl-render";

const attributes: JSLAttributes = { class: "example", disabled: true };
const animation = { attr: "opacity", from: 0, to: 1 };

const node: IJSLVNode = <custom-element {...attributes}
    style={{ "background-color": "red", opacity: 0.5 }}
    animation={animation}
    click={(event, vnode) => {
        const mouse: MouseEvent = event;
        const current: IJSLVNode = vnode;
        return false;
    }}
    keydown={(event) => event.key}
    data-custom="value"
    customAttribute="value" />;

const styles = <div style="color: red" animation={[animation]} click={null} />;

// @ts-expect-error The animation must have an attribute name.
const invalidAnimation = <div animation={{ from: 0, to: 1 }} />;

// @ts-expect-error Style must be a CSS string or a style object.
const invalidStyle = <div style={42} />;

// @ts-expect-error Click handlers receive a MouseEvent, not a KeyboardEvent.
const invalidEvent = <button click={(event: KeyboardEvent) => event.key} />;
