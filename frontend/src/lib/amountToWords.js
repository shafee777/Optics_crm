const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertBelowThousand(n) {
  let str = '';
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ONES[n % 10] : '');
  } else if (n > 0) {
    str += ONES[n];
  }
  return str.trim();
}

/**
 * Converts a numeric amount to Indian Currency Words format.
 * Example: 15420.50 -> "Rupees Fifteen Thousand Four Hundred Twenty and Fifty Paise Only"
 */
export function amountToWords(amount) {
  const num = Number(amount);
  if (isNaN(num) || num < 0) return '';
  if (num === 0) return 'Rupees Zero Only';

  const rounded = Math.round(num * 100) / 100;
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  let rupeesStr = '';
  if (rupees > 0) {
    let rem = rupees;

    const crores = Math.floor(rem / 10000000);
    rem %= 10000000;

    const lakhs = Math.floor(rem / 100000);
    rem %= 100000;

    const thousands = Math.floor(rem / 1000);
    rem %= 1000;

    const hundreds = rem;

    const parts = [];
    if (crores > 0) {
      parts.push(convertBelowThousand(crores) + ' Crore');
    }
    if (lakhs > 0) {
      parts.push(convertBelowThousand(lakhs) + ' Lakh');
    }
    if (thousands > 0) {
      parts.push(convertBelowThousand(thousands) + ' Thousand');
    }
    if (hundreds > 0) {
      parts.push(convertBelowThousand(hundreds));
    }

    rupeesStr = parts.join(' ');
  }

  let paiseStr = '';
  if (paise > 0) {
    paiseStr = convertBelowThousand(paise) + ' Paise';
  }

  if (rupeesStr && paiseStr) {
    return `Rupees ${rupeesStr} and ${paiseStr} Only`;
  } else if (rupeesStr) {
    return `Rupees ${rupeesStr} Only`;
  } else if (paiseStr) {
    return `${paiseStr} Only`;
  }

  return 'Rupees Zero Only';
}
