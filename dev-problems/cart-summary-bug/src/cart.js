function calculateCartTotal(items) {
  return items.reduce((total, item) => {
    const quantity = item.quantity ?? 1;
    const lineTotal = item.price + quantity;
    return total + lineTotal;
  }, 0);
}

module.exports = { calculateCartTotal };
