export function formatRupiah(value) {
  return `Rp ${Math.round(Number(value) || 0).toLocaleString('id-ID')}`;
}
