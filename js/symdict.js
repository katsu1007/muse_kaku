/* シンボル辞書（認識専用）— 図面の中の図形が「何であるか」を、幾何そのものではなく
 * 特徴（寸法・縦横比・円弧の割合・閉じているか・内側の閉曲線・分割線）で照合する。
 * 目的は図面の読み取り・解釈・認識だけ。メーカーの元データは使わず、
 * 一般化したルールパターンと、CC0の実測特徴だけでできている。
 * 認識のしきい値は類似度 0.90（2026-11-18 決定。誤認を避けるため高め）。
 * 0.90 未満、または候補が僅差のものは「不明」「要確認」のまま残し、確定しない。 */
export const SYM_THRESHOLD = 0.90;
export const SYM_DICT = [
 {
  "id": "wc-western",
  "category": "洋式大便器",
  "kind": "衛生器具",
  "patterns": [
   {
    "origin": "rule",
    "label": "壁掛け式",
    "size_range_mm": {
     "short": [
      350,
      450
     ],
     "long": [
      460,
      590
     ]
    },
    "aspect_range": [
     1.1,
     1.55
    ],
    "primitives": {
     "arc_share": [
      0.3,
      1.0
     ],
     "closed_outline": true,
     "inner_closed": true,
     "divider_min": null,
     "straight_back": true
    },
    "notes": "便器本体は楕円・円弧主体。背面は壁に接して直線になりやすい"
   },
   {
    "origin": "rule",
    "label": "タンク式（床置き）",
    "size_range_mm": {
     "short": [
      350,
      490
     ],
     "long": [
      630,
      810
     ]
    },
    "aspect_range": [
     1.4,
     2.05
    ],
    "primitives": {
     "arc_share": [
      0.25,
      1.0
     ],
     "closed_outline": true,
     "inner_closed": true,
     "divider_min": null,
     "straight_back": true
    },
    "notes": "便器＋タンクを一体で囲った外形。タンク側が直線的"
   }
  ]
 },
 {
  "id": "urinal",
  "category": "小便器",
  "kind": "衛生器具",
  "patterns": [
   {
    "origin": "rule",
    "label": "壁掛け式",
    "size_range_mm": {
     "short": [
      300,
      490
     ],
     "long": [
      320,
      590
     ]
    },
    "aspect_range": [
     0.85,
     1.5
    ],
    "primitives": {
     "arc_share": [
      0.3,
      1.0
     ],
     "closed_outline": true,
     "inner_closed": false,
     "divider_min": null,
     "straight_back": true
    },
    "notes": "涙滴形〜半楕円。壁側が直線、前方が丸い"
   },
   {
    "origin": "measured",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/urinal-plan-cad-block-f06078da/download",
     "block": "201_FURNITURE_BLOCKS_URINAL_PLAN",
     "file": "urinal-plan-cad-block.dxf"
    },
    "features": {
     "size_mm": {
      "short": 450.0,
      "long": 500.0
     },
     "aspect": 1.11,
     "hist": {
      "CIRCLE": 1,
      "ELLIPSE": 1,
      "LWPOLYLINE": 1
     },
     "arc_share": 0.67,
     "closed_outline": true,
     "n_entities": 3
    }
   }
  ]
 },
 {
  "id": "washbasin",
  "category": "洗面器",
  "kind": "衛生器具",
  "patterns": [
   {
    "origin": "rule",
    "label": "洗面器（カウンター・壁掛け）",
    "size_range_mm": {
     "short": [
      370,
      570
     ],
     "long": [
      440,
      760
     ]
    },
    "aspect_range": [
     1.0,
     1.65
    ],
    "primitives": {
     "arc_share": [
      0.15,
      1.0
     ],
     "closed_outline": true,
     "inner_closed": true,
     "divider_min": null,
     "straight_back": true
    },
    "notes": "外形（矩形〜角丸）の内側にボウルの楕円が入る二重構造が特徴"
   },
   {
    "origin": "rule",
    "label": "手洗い器（小型）",
    "size_range_mm": {
     "short": [
      270,
      370
     ],
     "long": [
      390,
      570
     ]
    },
    "aspect_range": [
     1.25,
     1.8
    ],
    "primitives": {
     "arc_share": [
      0.15,
      1.0
     ],
     "closed_outline": true,
     "inner_closed": false,
     "divider_min": null,
     "straight_back": true
    },
    "notes": "角丸矩形が典型。トイレ内の手洗い用"
   }
  ]
 },
 {
  "id": "locker",
  "category": "ロッカー",
  "kind": "収納・什器",
  "patterns": [
   {
    "origin": "rule",
    "label": "2連（W900級）",
    "size_range_mm": {
     "short": [
      440,
      630
     ],
     "long": [
      840,
      960
     ]
    },
    "aspect_range": [
     1.4,
     2.05
    ],
    "primitives": {
     "arc_share": [
      0.0,
      0.1
     ],
     "closed_outline": true,
     "inner_closed": false,
     "divider_min": 1,
     "straight_back": true
    },
    "notes": "矩形＋前面の扉分割線。奥行は450〜600mm台が標準"
   },
   {
    "origin": "rule",
    "label": "1連（W450級）",
    "size_range_mm": {
     "short": [
      440,
      630
     ],
     "long": [
      400,
      520
     ]
    },
    "aspect_range": [
     0.75,
     1.1
    ],
    "primitives": {
     "arc_share": [
      0.0,
      0.1
     ],
     "closed_outline": true,
     "inner_closed": false,
     "divider_min": 0,
     "straight_back": true
    },
    "notes": "単体は正方形に近い矩形。連なって描かれることが多い"
   }
  ]
 },
 {
  "id": "desk",
  "category": "机・デスク",
  "kind": "オフィス什器",
  "patterns": [
   {
    "origin": "rule",
    "label": "一般",
    "size_range_mm": {
     "short": [
      450,
      850
     ],
     "long": [
      900,
      2100
     ]
    },
    "aspect_range": [
     1.35,
     2.8
    ],
    "primitives": {
     "arc_share": [
      0.0,
      0.15
     ],
     "closed_outline": true,
     "inner_closed": false,
     "divider_min": null,
     "straight_back": null
    },
    "notes": "矩形主体。背面パネルの帯が付く型もある"
   }
  ]
 },
 {
  "id": "chair",
  "category": "椅子",
  "kind": "オフィス什器",
  "patterns": [
   {
    "origin": "rule",
    "label": "一般",
    "size_range_mm": {
     "short": [
      390,
      730
     ],
     "long": [
      390,
      760
     ]
    },
    "aspect_range": [
     0.8,
     1.3
    ],
    "primitives": {
     "arc_share": [
      0.3,
      1.0
     ],
     "closed_outline": true,
     "inner_closed": false,
     "divider_min": null,
     "straight_back": false
    },
    "notes": "座面＋背もたれで円弧を多く含む。ほぼ正方形の外形"
   }
  ]
 },
 {
  "id": "storage",
  "category": "収納（棚・キャビネット）",
  "kind": "収納・什器",
  "patterns": [
   {
    "origin": "rule",
    "label": "一般",
    "size_range_mm": {
     "short": [
      310,
      520
     ],
     "long": [
      780,
      2500
     ]
    },
    "aspect_range": [
     1.7,
     5.5
    ],
    "primitives": {
     "arc_share": [
      0.0,
      0.1
     ],
     "closed_outline": true,
     "inner_closed": false,
     "divider_min": 1,
     "straight_back": true
    },
    "notes": "細長い矩形＋扉・棚板の分割線。壁際に並ぶ"
   }
  ]
 }
];

/* 特徴 f: { short, long, arcShare, closed, innerClosed, dividers }
 *  short/long は外形の短辺・長辺（mm）。dividers は内部の分割線の本数（数えられない時は null）。 */
function gateRange(v, range) { return v == null || range == null || (v >= range[0] && v <= range[1]); }

export function scorePattern(p, f) {
  if (p.origin === "measured") {
    const s = p.features.size_mm;
    const tolS = Math.max(18, s.short * 0.05), tolL = Math.max(18, s.long * 0.05);
    if (Math.abs(f.short - s.short) > tolS || Math.abs(f.long - s.long) > tolL) return null;
    if (f.arcShare != null && Math.abs(f.arcShare - p.features.arc_share) > 0.3) return null;
    if (f.closed != null && p.features.closed_outline != null && f.closed !== p.features.closed_outline) return null;
    const close = 1 - (Math.abs(f.short - s.short) / s.short + Math.abs(f.long - s.long) / s.long) / 2;
    return Math.max(0, Math.min(1, close));
  }
  const sr = p.size_range_mm, pr = p.primitives || {};
  if (!gateRange(f.short, sr.short) || !gateRange(f.long, sr.long)) return null;
  if (f.short && f.long && !gateRange(f.long / f.short, p.aspect_range)) return null;
  if (!gateRange(f.arcShare, pr.arc_share)) return null;
  if (pr.closed_outline != null && f.closed != null && f.closed !== pr.closed_outline) return null;
  if (pr.inner_closed != null && f.innerClosed != null && f.innerClosed !== pr.inner_closed) return null;
  if (pr.divider_min != null && f.dividers != null && f.dividers < pr.divider_min) return null;
  const cs = (v, r) => 1 - Math.min(1, Math.abs(v - (r[0] + r[1]) / 2) / ((r[1] - r[0]) / 2 + 1));
  return 0.90 + 0.10 * (cs(f.short, sr.short) + cs(f.long, sr.long)) / 2;
}

/* 判定の3区分（画面の色分け用）：検出＝緑、類似＝橙、不明＝灰色 */
export const SYM_VERDICTS = {
  hit: { key: "hit", name: "検出", color: "#3ccf8e" },
  near: { key: "near", name: "類似", color: "#ffb020" },
  unknown: { key: "unknown", name: "不明", color: "#9aa7b8" }
};

/* 図面から拾った器具の外形（b = [x0, y0, x1, y1]、単位は m）から辞書で判定する。
 * 器具のデータには外形しか無いので、判定に使う特徴は寸法だけ（円弧の割合・輪郭の閉じなどは null＝ゲートを通す）。
 * 戻り値: { verdict: "hit" | "near" | "unknown", category, score, short, long }（short/long は mm） */
export function classifyBox(b) {
  if (!b || b.length < 4) return { verdict: "unknown", category: null, score: 0, short: 0, long: 0 };
  const w = Math.abs(b[2] - b[0]) * 1000, h = Math.abs(b[3] - b[1]) * 1000;
  const short = Math.min(w, h), long = Math.max(w, h);
  const r = classifySymbol({ short, long, arcShare: null, closed: null, innerClosed: null, dividers: null });
  if (r.result === "不明") return { verdict: "unknown", category: null, score: r.score, short, long };
  if (r.result === "要確認") return { verdict: "near", category: r.category, score: r.score, short, long };
  return { verdict: "hit", category: r.result, score: r.score, short, long };
}

/* 戻り値: { result: カテゴリ名 | "要確認" | "不明", score, category, label } */
export function classifySymbol(f) {
  const hits = [];
  for (const e of SYM_DICT) for (const p of e.patterns) {
    const s = scorePattern(p, f);
    if (s != null) hits.push({ score: s, category: e.category, kind: e.kind, label: p.label || p.origin });
  }
  hits.sort((a, b) => b.score - a.score);
  if (!hits.length || hits[0].score < SYM_THRESHOLD) return { result: "不明", score: hits.length ? hits[0].score : 0, category: null, label: null };
  if (hits.length > 1 && hits[0].category !== hits[1].category && hits[0].score - hits[1].score < 0.05)
    return { result: "要確認", score: hits[0].score, category: hits[0].category, label: hits[0].label };
  return { result: hits[0].category, score: hits[0].score, category: hits[0].category, label: hits[0].label };
}
