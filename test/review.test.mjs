import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeAnswer, submitsAnswer } from '../src/features/review/review.ts';

test('compares case, Unicode width, and whitespace without ignoring punctuation', () => {
  assert.equal(gradeAnswer('  Ｈello　\n WORLD ', 'hello world'), true);
  assert.equal(gradeAnswer('ＡＢＣ', 'abc'), true);
  assert.equal(gradeAnswer('缓存', '缓存。'), false);
  assert.equal(gradeAnswer('任意文本', '  \n'), null);
});

test('only plain Enter submits outside of IME composition', () => {
  const enter = {
    key: 'Enter', shiftKey: false, altKey: false, ctrlKey: false, metaKey: false,
    repeat: false, isComposing: false, keyCode: 13,
  };
  assert.equal(submitsAnswer(enter, false), true);
  for (const override of [{ shiftKey: true }, { repeat: true }, { isComposing: true }, { keyCode: 229 }]) {
    assert.equal(submitsAnswer({ ...enter, ...override }, false), false);
  }
  assert.equal(submitsAnswer(enter, true), false);
});
