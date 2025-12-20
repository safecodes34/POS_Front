import { useState, useEffect } from 'react';
import visa from "../assets/card-brands/visa.svg";
import mastercard from "../assets/card-brands/mastercard.svg";
import amex from "../assets/card-brands/amex.svg";
import discover from "../assets/card-brands/discover.svg";
// Optional brands
import jcb from "../assets/card-brands/jcb.svg";
import diners from "../assets/card-brands/diners.svg";
import unionpay from "../assets/card-brands/unionpay.svg";
import maestro from "../assets/card-brands/maestro.svg";

const BRANDS = [
  { id: "visa", label: "VISA", src: visa },
  { id: "mastercard", label: "MC", src: mastercard },
  { id: "amex", label: "AMEX", src: amex },
  { id: "discover", label: "DISC", src: discover },
  // Optional brands (uncomment if needed)
  // { id: "jcb", label: "JCB", src: jcb },
  // { id: "diners", label: "DINERS", src: diners },
  // { id: "unionpay", label: "UP", src: unionpay },
  // { id: "maestro", label: "MAESTRO", src: maestro },
];

// Simple BIN-based card brand detection
function normalizeCardNumber(num) {
  return (num || "").replace(/\s+/g, "");
}

function detectBrand(number) {
  const normalized = normalizeCardNumber(number);
  if (!normalized || normalized.length < 4) return null;

  const firstDigit = normalized[0];
  const firstTwo = normalized.substring(0, 2);
  const firstFour = normalized.substring(0, 4);

  // Visa: starts with 4
  if (firstDigit === "4") {
    return "visa";
  }

  // Mastercard: 51-55 or 2221-2720
  if (firstTwo >= "51" && firstTwo <= "55") {
    return "mastercard";
  }
  if (firstFour >= "2221" && firstFour <= "2720") {
    return "mastercard";
  }

  // American Express: 34 or 37
  if (firstTwo === "34" || firstTwo === "37") {
    return "amex";
  }

  // Discover: 6011, 622126-622925, 624000-626999, 628200-628899, 64, 65
  if (normalized.startsWith("6011")) {
    return "discover";
  }
  if (firstFour >= "6221" && firstFour <= "6229") {
    return "discover";
  }
  if (firstFour >= "6240" && firstFour <= "6269") {
    return "discover";
  }
  if (firstFour >= "6282" && firstFour <= "6288") {
    return "discover";
  }
  if (firstTwo === "64" || firstTwo === "65") {
    return "discover";
  }

  // JCB: 3528-3589
  if (firstFour >= "3528" && firstFour <= "3589") {
    return "jcb";
  }

  // Diners Club: 300-305, 309, 36, 38-39
  if (firstTwo === "30") {
    const third = normalized[2];
    if (third >= "0" && third <= "5") return "diners";
    if (third === "9") return "diners";
  }
  if (firstTwo === "36" || firstTwo === "38" || firstTwo === "39") {
    return "diners";
  }

  // UnionPay: 62
  if (normalized.startsWith("62")) {
    return "unionpay";
  }

  // Maestro: 50, 56-69
  if (firstTwo === "50" || (firstTwo >= "56" && firstTwo <= "69")) {
    return "maestro";
  }

  return null;
}

export default function CardBrandPills({ cardNumber = "" }) {
  const [activeBrand, setActiveBrand] = useState(null);

  useEffect(() => {
    const detected = detectBrand(cardNumber);
    setActiveBrand(detected);
  }, [cardNumber]);

  return (
    <div className="brand-row" aria-label="Accepted card brands">
      {BRANDS.map((brand) => (
        <div
          key={brand.id}
          className={`brand-pill ${activeBrand === brand.id ? "active" : ""}`}
          title={brand.label}
        >
          <img className="brand-icon" src={brand.src} alt={brand.label} />
        </div>
      ))}
    </div>
  );
}

