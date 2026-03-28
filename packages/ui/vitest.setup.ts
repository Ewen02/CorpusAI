import '@testing-library/jest-dom/vitest';

// jsdom stubs for DOM APIs not implemented
Element.prototype.scrollIntoView = () => {};
