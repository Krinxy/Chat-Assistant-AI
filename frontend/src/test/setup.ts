import "@testing-library/jest-dom/vitest";

if (typeof Element !== "undefined" && Element.prototype.scrollIntoView === undefined) {
	Element.prototype.scrollIntoView = () => {};
}
