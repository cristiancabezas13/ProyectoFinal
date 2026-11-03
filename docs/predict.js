/* Inferencia con los mismos árboles exportados desde scikit-learn. */
function predict(model, values) {
  if (values.length !== model.features.length || values.some(v => !Number.isFinite(v))) {
    throw new Error('Completa las ocho entradas con números válidos.');
  }
  const x = values.map(Math.fround);
  let total = 0;
  for (const tree of model.trees) {
    let node = 0;
    while (tree.left[node] !== -1) {
      node = x[tree.feature[node]] <= tree.threshold[node] ? tree.left[node] : tree.right[node];
    }
    total += tree.value[node];
  }
  return total / model.trees.length;
}
if (typeof module !== 'undefined') module.exports = { predict };
