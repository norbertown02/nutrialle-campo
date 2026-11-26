export function normalizeQuoteProductName(name) {
  if (typeof name !== 'string') return name

  return name.replace(/^(\s*nutrimix\s+)(ave)\b/i, (_, prefix, ave) =>
    prefix + ave + (ave === ave.toUpperCase() ? 'S' : 's'),
  )
}

export function normalizeQuoteProductNames(quote) {
  if (!Array.isArray(quote.items)) return quote

  return {
    ...quote,
    items: quote.items.map(item => {
      const name = normalizeQuoteProductName(item?.product_name)
      return name === item?.product_name ? item : { ...item, product_name: name }
    }),
  }
}
