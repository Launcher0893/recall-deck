export function id(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error('记录编号无效。');
  return value;
}

export function content(value, label, limit, required = true) {
  if (typeof value !== 'string' || value.length > limit || (required && !value.trim())) {
    throw new Error(label + '内容无效，请检查长度或是否为空。');
  }
  return value;
}
