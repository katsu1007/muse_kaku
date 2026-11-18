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
      1
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
      1
     ],
     "closed_outline": true,
     "inner_closed": true,
     "divider_min": null,
     "straight_back": true
    },
    "notes": "便器＋タンクを一体で囲った外形。タンク側が直線的"
   },
   {
    "origin": "measured",
    "label": "バリアフリー（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/accessible-wc-plan-cad-block-f351620d/download",
     "block": "201_FURNITURE_BLOCKS_ACCESSIBLE_WC_PLAN",
     "file": "accessible-wc-plan-cad-block-f351620d.dxf"
    },
    "features": {
     "size_mm": {
      "short": 710,
      "long": 725
     },
     "aspect": 1.02,
     "hist": {
      "LWPOLYLINE": 2,
      "ELLIPSE": 3
     },
     "arc_share": 0.6,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 5
    }
   },
   {
    "origin": "measured",
    "label": "タンク式（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/close-coupled-wc-plan-cad-block-49c9196f/download",
     "block": "201_FURNITURE_BLOCKS_CLOSE_COUPLED_WC_PLAN",
     "file": "close-coupled-wc-plan-cad-block-49c9196f.dxf"
    },
    "features": {
     "size_mm": {
      "short": 430,
      "long": 675
     },
     "aspect": 1.57,
     "hist": {
      "LWPOLYLINE": 1,
      "ELLIPSE": 3
     },
     "arc_share": 0.75,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 4
    }
   },
   {
    "origin": "measured",
    "label": "壁掛け式（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/wall-hung-wc-plan-cad-block-937a5652/download",
     "block": "201_FURNITURE_BLOCKS_WALL_HUNG_WC_PLAN",
     "file": "wall-hung-wc-plan-cad-block-937a5652.dxf"
    },
    "features": {
     "size_mm": {
      "short": 590,
      "long": 675
     },
     "aspect": 1.14,
     "hist": {
      "LWPOLYLINE": 2,
      "ELLIPSE": 3
     },
     "arc_share": 0.6,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 5
    }
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
      1
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
      "short": 450,
      "long": 500
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
     1,
     1.65
    ],
    "primitives": {
     "arc_share": [
      0.15,
      1
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
      1
     ],
     "closed_outline": true,
     "inner_closed": false,
     "divider_min": null,
     "straight_back": true
    },
    "notes": "角丸矩形が典型。トイレ内の手洗い用"
   },
   {
    "origin": "measured",
    "label": "洗面器2連（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/double-basin-plan-cad-block-0f88f09b/download",
     "block": "201_FURNITURE_BLOCKS_DOUBLE_BASIN_PLAN",
     "file": "double-basin-plan-cad-block-0f88f09b.dxf"
    },
    "features": {
     "size_mm": {
      "short": 480,
      "long": 1200
     },
     "aspect": 2.5,
     "hist": {
      "LWPOLYLINE": 3,
      "ELLIPSE": 2,
      "CIRCLE": 2
     },
     "arc_share": 0.57,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 7
    }
   },
   {
    "origin": "measured",
    "label": "ペデスタル式（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/pedestal-basin-plan-cad-block-f98bbfe4/download",
     "block": "201_FURNITURE_BLOCKS_PEDESTAL_BASIN_PLAN",
     "file": "pedestal-basin-plan-cad-block-f98bbfe4.dxf"
    },
    "features": {
     "size_mm": {
      "short": 480,
      "long": 600
     },
     "aspect": 1.25,
     "hist": {
      "LWPOLYLINE": 2,
      "ELLIPSE": 2,
      "CIRCLE": 1
     },
     "arc_share": 0.6,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 5
    }
   },
   {
    "origin": "measured",
    "label": "洗面器（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/single-basin-plan-cad-block-4797164b/download",
     "block": "201_FURNITURE_BLOCKS_SINGLE_BASIN_PLAN",
     "file": "single-basin-plan-cad-block-4797164b.dxf"
    },
    "features": {
     "size_mm": {
      "short": 480,
      "long": 600
     },
     "aspect": 1.25,
     "hist": {
      "LWPOLYLINE": 2,
      "ELLIPSE": 1,
      "CIRCLE": 1
     },
     "arc_share": 0.5,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 4
    }
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
      0,
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
      0,
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
      0,
      0.15
     ],
     "closed_outline": true,
     "inner_closed": false,
     "divider_min": null,
     "straight_back": null
    },
    "notes": "矩形主体。背面パネルの帯が付く型もある"
   },
   {
    "origin": "rule",
    "label": "ベンチデスク（長机）",
    "size_range_mm": {
     "short": [
      550,
      1800
     ],
     "long": [
      2400,
      7200
     ]
    },
    "aspect_range": [
     2,
     9
    ],
    "primitives": {
     "arc_share": [
      0,
      0.12
     ],
     "closed_outline": true,
     "inner_closed": null,
     "divider_min": 1,
     "straight_back": null
    },
    "needs_features": [
     "arcShare",
     "closed",
     "dividers"
    ],
    "notes": "両側に椅子が並ぶ長いベンチ式の机。内側に分割線（脚・配線ダクト等）がある事が条件。寸法だけでは判定しない（needs_features）"
   },
   {
    "origin": "measured",
    "label": "ベンチデスク一体型（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/bench-desk-pair-plan-cad-block-0f156e78/download",
     "block": "201_FURNITURE_BLOCKS_BENCH_DESK_PAIR_PLAN",
     "file": "bench-desk-pair-plan-cad-block-0f156e78.dxf"
    },
    "features": {
     "size_mm": {
      "short": 1100,
      "long": 2400
     },
     "aspect": 2.18,
     "hist": {
      "LWPOLYLINE": 8
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 8
    }
   },
   {
    "origin": "measured",
    "label": "コンソールテーブル（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/console-table-plan-cad-block-3106da33/download",
     "block": "201_FURNITURE_BLOCKS_CONSOLE_TABLE_PLAN",
     "file": "console-table-plan-cad-block-3106da33.dxf"
    },
    "features": {
     "size_mm": {
      "short": 350,
      "long": 1300
     },
     "aspect": 3.71,
     "hist": {
      "LWPOLYLINE": 3
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 3
    }
   },
   {
    "origin": "measured",
    "label": "コーナーデスク（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/corner-desk-plan-cad-block-8143a44f/download",
     "block": "201_FURNITURE_BLOCKS_CORNER_DESK_PLAN",
     "file": "corner-desk-plan-cad-block-8143a44f.dxf"
    },
    "features": {
     "size_mm": {
      "short": 1200,
      "long": 1400
     },
     "aspect": 1.17,
     "hist": {
      "LWPOLYLINE": 3
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 3
    }
   },
   {
    "origin": "measured",
    "label": "ドレッサー（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/dressing-table-plan-cad-block-4f02a242/download",
     "block": "201_FURNITURE_BLOCKS_DRESSING_TABLE_PLAN",
     "file": "dressing-table-plan-cad-block-4f02a242.dxf"
    },
    "features": {
     "size_mm": {
      "short": 700,
      "long": 1200
     },
     "aspect": 1.71,
     "hist": {
      "LWPOLYLINE": 2
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 2
    }
   },
   {
    "origin": "measured",
    "label": "コーヒーテーブル（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/rectangular-coffee-table-plan-cad-block-e3411af5/download",
     "block": "201_FURNITURE_BLOCKS_RECTANGULAR_COFFEE_TABLE_PLAN",
     "file": "rectangular-coffee-table-plan-cad-block-e3411af5.dxf"
    },
    "features": {
     "size_mm": {
      "short": 700,
      "long": 1100
     },
     "aspect": 1.57,
     "hist": {
      "LWPOLYLINE": 1
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": false,
     "n_entities": 1
    }
   },
   {
    "origin": "measured",
    "label": "ダイニングテーブル4人・椅子付き（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/rectangular-dining-table-four-seats-plan-cad-block-e9c537ab/download",
     "block": "201_FURNITURE_BLOCKS_RECTANGULAR_DINING_TABLE_FOUR_SEATS_PLAN",
     "file": "rectangular-dining-table-four-seats-plan-cad-block-e9c537ab.dxf"
    },
    "features": {
     "size_mm": {
      "short": 1200,
      "long": 1900
     },
     "aspect": 1.58,
     "hist": {
      "LWPOLYLINE": 9
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": false,
     "n_entities": 9
    }
   },
   {
    "origin": "measured",
    "label": "ダイニングテーブル6人・椅子付き（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/rectangular-dining-table-six-seats-plan-cad-block-04a9f345/download",
     "block": "201_FURNITURE_BLOCKS_RECTANGULAR_DINING_TABLE_SIX_SEATS_PLAN",
     "file": "rectangular-dining-table-six-seats-plan-cad-block-04a9f345.dxf"
    },
    "features": {
     "size_mm": {
      "short": 1800,
      "long": 1900
     },
     "aspect": 1.06,
     "hist": {
      "LWPOLYLINE": 13
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": false,
     "n_entities": 13
    }
   },
   {
    "origin": "measured",
    "label": "会議テーブル・椅子付き（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/rectangular-meeting-table-plan-cad-block-f54702ab/download",
     "block": "201_FURNITURE_BLOCKS_RECTANGULAR_MEETING_TABLE_PLAN",
     "file": "rectangular-meeting-table-plan-cad-block-f54702ab.dxf"
    },
    "features": {
     "size_mm": {
      "short": 1800,
      "long": 1900
     },
     "aspect": 1.06,
     "hist": {
      "LWPOLYLINE": 9
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": false,
     "n_entities": 9
    }
   },
   {
    "origin": "measured",
    "label": "丸コーヒーテーブル（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/round-coffee-table-plan-cad-block-8ababc9b/download",
     "block": "201_FURNITURE_BLOCKS_ROUND_COFFEE_TABLE_PLAN",
     "file": "round-coffee-table-plan-cad-block-8ababc9b.dxf"
    },
    "features": {
     "size_mm": {
      "short": 1100,
      "long": 1100
     },
     "aspect": 1,
     "hist": {
      "CIRCLE": 1
     },
     "arc_share": 1,
     "closed_outline": true,
     "inner_closed": false,
     "n_entities": 1
    }
   },
   {
    "origin": "measured",
    "label": "丸ダイニングテーブル・椅子付き（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/round-dining-table-four-seats-plan-cad-block-192d44d3/download",
     "block": "201_FURNITURE_BLOCKS_ROUND_DINING_TABLE_FOUR_SEATS_PLAN",
     "file": "round-dining-table-four-seats-plan-cad-block-192d44d3.dxf"
    },
    "features": {
     "size_mm": {
      "short": 2220,
      "long": 2220
     },
     "aspect": 1,
     "hist": {
      "CIRCLE": 1,
      "LWPOLYLINE": 8
     },
     "arc_share": 0.11,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 9
    }
   },
   {
    "origin": "measured",
    "label": "丸会議テーブル・椅子付き（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/round-meeting-table-plan-cad-block-4b5941f7/download",
     "block": "201_FURNITURE_BLOCKS_ROUND_MEETING_TABLE_PLAN",
     "file": "round-meeting-table-plan-cad-block-4b5941f7.dxf"
    },
    "features": {
     "size_mm": {
      "short": 2820,
      "long": 2820
     },
     "aspect": 1,
     "hist": {
      "CIRCLE": 1,
      "LWPOLYLINE": 8
     },
     "arc_share": 0.11,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 9
    }
   },
   {
    "origin": "measured",
    "label": "サイドテーブル（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/side-table-plan-cad-block-34218654/download",
     "block": "201_FURNITURE_BLOCKS_SIDE_TABLE_PLAN",
     "file": "side-table-plan-cad-block-34218654.dxf"
    },
    "features": {
     "size_mm": {
      "short": 600,
      "long": 600
     },
     "aspect": 1,
     "hist": {
      "CIRCLE": 1
     },
     "arc_share": 1,
     "closed_outline": true,
     "inner_closed": false,
     "n_entities": 1
    }
   },
   {
    "origin": "measured",
    "label": "ストレートデスク（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/straight-desk-plan-cad-block-37bb965b/download",
     "block": "201_FURNITURE_BLOCKS_STRAIGHT_DESK_PLAN",
     "file": "straight-desk-plan-cad-block-37bb965b.dxf"
    },
    "features": {
     "size_mm": {
      "short": 700,
      "long": 1200
     },
     "aspect": 1.71,
     "hist": {
      "LWPOLYLINE": 2
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 2
    }
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
      1
     ],
     "closed_outline": true,
     "inner_closed": false,
     "divider_min": null,
     "straight_back": false
    },
    "notes": "座面＋背もたれで円弧を多く含む。ほぼ正方形の外形"
   },
   {
    "origin": "measured",
    "label": "アームチェア（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/armchair-plan-cad-block-83848260/download",
     "block": "201_FURNITURE_BLOCKS_ARMCHAIR_PLAN",
     "file": "armchair-plan-cad-block-83848260.dxf"
    },
    "features": {
     "size_mm": {
      "short": 850,
      "long": 950
     },
     "aspect": 1.12,
     "hist": {
      "LWPOLYLINE": 3
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 3
    }
   },
   {
    "origin": "measured",
    "label": "ダイニングチェア（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/dining-chair-plan-cad-block-5061c00f/download",
     "block": "201_FURNITURE_BLOCKS_DINING_CHAIR_PLAN",
     "file": "dining-chair-plan-cad-block-5061c00f.dxf"
    },
    "features": {
     "size_mm": {
      "short": 480,
      "long": 500
     },
     "aspect": 1.04,
     "hist": {
      "LWPOLYLINE": 2
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": false,
     "n_entities": 2
    }
   },
   {
    "origin": "measured",
    "label": "ハイチェア（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/high-chair-plan-cad-block-a21602fa/download",
     "block": "201_FURNITURE_BLOCKS_HIGH_CHAIR_PLAN",
     "file": "high-chair-plan-cad-block-a21602fa.dxf"
    },
    "features": {
     "size_mm": {
      "short": 500,
      "long": 590
     },
     "aspect": 1.18,
     "hist": {
      "LWPOLYLINE": 3
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": false,
     "n_entities": 3
    }
   },
   {
    "origin": "measured",
    "label": "事務椅子（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/office-task-chair-plan-cad-block-3d0841c9/download",
     "block": "201_FURNITURE_BLOCKS_OFFICE_TASK_CHAIR_PLAN",
     "file": "office-task-chair-plan-cad-block-3d0841c9.dxf"
    },
    "features": {
     "size_mm": {
      "short": 633.2,
      "long": 665.7
     },
     "aspect": 1.05,
     "hist": {
      "LWPOLYLINE": 7
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 7
    }
   },
   {
    "origin": "measured",
    "label": "来客用椅子（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/visitor-chair-plan-cad-block-656d39f8/download",
     "block": "201_FURNITURE_BLOCKS_VISITOR_CHAIR_PLAN",
     "file": "visitor-chair-plan-cad-block-656d39f8.dxf"
    },
    "features": {
     "size_mm": {
      "short": 480,
      "long": 500
     },
     "aspect": 1.04,
     "hist": {
      "LWPOLYLINE": 2
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": false,
     "n_entities": 2
    }
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
      0,
      0.1
     ],
     "closed_outline": true,
     "inner_closed": false,
     "divider_min": 1,
     "straight_back": true
    },
    "notes": "細長い矩形＋扉・棚板の分割線。壁際に並ぶ"
   },
   {
    "origin": "measured",
    "label": "本棚（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/bookcase-plan-cad-block-f1f3a7e8/download",
     "block": "201_FURNITURE_BLOCKS_BOOKCASE_PLAN",
     "file": "bookcase-plan-cad-block-f1f3a7e8.dxf"
    },
    "features": {
     "size_mm": {
      "short": 320,
      "long": 900
     },
     "aspect": 2.81,
     "hist": {
      "LWPOLYLINE": 3
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 3
    }
   },
   {
    "origin": "measured",
    "label": "チェスト（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/chest-of-drawers-plan-cad-block-0142d84f/download",
     "block": "201_FURNITURE_BLOCKS_CHEST_OF_DRAWERS_PLAN",
     "file": "chest-of-drawers-plan-cad-block-0142d84f.dxf"
    },
    "features": {
     "size_mm": {
      "short": 450,
      "long": 900
     },
     "aspect": 2,
     "hist": {
      "LWPOLYLINE": 3
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 3
    }
   },
   {
    "origin": "measured",
    "label": "書類棚（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/filing-cabinet-plan-cad-block-6e915456/download",
     "block": "201_FURNITURE_BLOCKS_FILING_CABINET_PLAN",
     "file": "filing-cabinet-plan-cad-block-6e915456.dxf"
    },
    "features": {
     "size_mm": {
      "short": 470,
      "long": 620
     },
     "aspect": 1.32,
     "hist": {
      "LWPOLYLINE": 3
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 3
    }
   },
   {
    "origin": "measured",
    "label": "メディアキャビネット（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/media-cabinet-plan-cad-block-f4a09b71/download",
     "block": "201_FURNITURE_BLOCKS_MEDIA_CABINET_PLAN",
     "file": "media-cabinet-plan-cad-block-f4a09b71.dxf"
    },
    "features": {
     "size_mm": {
      "short": 450,
      "long": 1600
     },
     "aspect": 3.56,
     "hist": {
      "LWPOLYLINE": 3
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": false,
     "n_entities": 3
    }
   },
   {
    "origin": "measured",
    "label": "ナイトテーブル（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/nightstand-plan-cad-block-97795bc2/download",
     "block": "201_FURNITURE_BLOCKS_NIGHTSTAND_PLAN",
     "file": "nightstand-plan-cad-block-97795bc2.dxf"
    },
    "features": {
     "size_mm": {
      "short": 450,
      "long": 500
     },
     "aspect": 1.11,
     "hist": {
      "LWPOLYLINE": 3
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 3
    }
   },
   {
    "origin": "measured",
    "label": "脇机・ワゴン（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/office-pedestal-plan-cad-block-fcdbc806/download",
     "block": "201_FURNITURE_BLOCKS_OFFICE_PEDESTAL_PLAN",
     "file": "office-pedestal-plan-cad-block-fcdbc806.dxf"
    },
    "features": {
     "size_mm": {
      "short": 420,
      "long": 550
     },
     "aspect": 1.31,
     "hist": {
      "LWPOLYLINE": 3
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 3
    }
   },
   {
    "origin": "measured",
    "label": "サイドボード（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/sideboard-plan-cad-block-4ba5d5b0/download",
     "block": "201_FURNITURE_BLOCKS_SIDEBOARD_PLAN",
     "file": "sideboard-plan-cad-block-4ba5d5b0.dxf"
    },
    "features": {
     "size_mm": {
      "short": 450,
      "long": 1600
     },
     "aspect": 3.56,
     "hist": {
      "LWPOLYLINE": 3
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": false,
     "n_entities": 3
    }
   },
   {
    "origin": "measured",
    "label": "収納棚（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/storage-cupboard-plan-cad-block-b8096457/download",
     "block": "201_FURNITURE_BLOCKS_STORAGE_CUPBOARD_PLAN",
     "file": "storage-cupboard-plan-cad-block-b8096457.dxf"
    },
    "features": {
     "size_mm": {
      "short": 450,
      "long": 900
     },
     "aspect": 2,
     "hist": {
      "LWPOLYLINE": 3
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 3
    }
   },
   {
    "origin": "measured",
    "label": "ワードローブ（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/two-door-wardrobe-plan-cad-block-0ebd8e25/download",
     "block": "201_FURNITURE_BLOCKS_TWO_DOOR_WARDROBE_PLAN",
     "file": "two-door-wardrobe-plan-cad-block-0ebd8e25.dxf"
    },
    "features": {
     "size_mm": {
      "short": 600,
      "long": 1200
     },
     "aspect": 2,
     "hist": {
      "LWPOLYLINE": 3
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": false,
     "n_entities": 3
    }
   }
  ]
 },
 {
  "category": "浴槽",
  "kind": "衛生器具",
  "patterns": [
   {
    "origin": "measured",
    "label": "浴槽（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/bath-plan-cad-block-0f33a3e3/download",
     "block": "201_FURNITURE_BLOCKS_BATH_PLAN",
     "file": "bath-plan-cad-block-0f33a3e3.dxf"
    },
    "features": {
     "size_mm": {
      "short": 750,
      "long": 1700
     },
     "aspect": 2.27,
     "hist": {
      "LWPOLYLINE": 3,
      "CIRCLE": 1
     },
     "arc_share": 0.25,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 4
    }
   }
  ]
 },
 {
  "category": "ベッド",
  "kind": "家具",
  "patterns": [
   {
    "origin": "measured",
    "label": "2段ベッド（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/bunk-bed-plan-cad-block-fead4a43/download",
     "block": "201_FURNITURE_BLOCKS_BUNK_BED_PLAN",
     "file": "bunk-bed-plan-cad-block-fead4a43.dxf"
    },
    "features": {
     "size_mm": {
      "short": 1000,
      "long": 2200
     },
     "aspect": 2.2,
     "hist": {
      "LWPOLYLINE": 9
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 9
    }
   },
   {
    "origin": "measured",
    "label": "ダブル（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/double-bed-plan-cad-block-f2ade2fa/download",
     "block": "201_FURNITURE_BLOCKS_DOUBLE_BED_PLAN",
     "file": "double-bed-plan-cad-block-f2ade2fa.dxf"
    },
    "features": {
     "size_mm": {
      "short": 1450,
      "long": 2020
     },
     "aspect": 1.39,
     "hist": {
      "LWPOLYLINE": 6
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 6
    }
   },
   {
    "origin": "measured",
    "label": "キング（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/king-bed-plan-cad-block-32c512e2/download",
     "block": "201_FURNITURE_BLOCKS_KING_BED_PLAN",
     "file": "king-bed-plan-cad-block-32c512e2.dxf"
    },
    "features": {
     "size_mm": {
      "short": 2030,
      "long": 2150
     },
     "aspect": 1.06,
     "hist": {
      "LWPOLYLINE": 6
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 6
    }
   },
   {
    "origin": "measured",
    "label": "クイーン（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/queen-bed-plan-cad-block-879618d7/download",
     "block": "201_FURNITURE_BLOCKS_QUEEN_BED_PLAN",
     "file": "queen-bed-plan-cad-block-879618d7.dxf"
    },
    "features": {
     "size_mm": {
      "short": 1620,
      "long": 2150
     },
     "aspect": 1.33,
     "hist": {
      "LWPOLYLINE": 6
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 6
    }
   },
   {
    "origin": "measured",
    "label": "シングル（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/single-bed-plan-cad-block-59a27591/download",
     "block": "201_FURNITURE_BLOCKS_SINGLE_BED_PLAN",
     "file": "single-bed-plan-cad-block-59a27591.dxf"
    },
    "features": {
     "size_mm": {
      "short": 1000,
      "long": 2020
     },
     "aspect": 2.02,
     "hist": {
      "LWPOLYLINE": 5
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 5
    }
   }
  ]
 },
 {
  "category": "キッチン・洗濯設備",
  "kind": "設備",
  "patterns": [
   {
    "origin": "measured",
    "label": "コンロ（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/cooktop-plan-cad-block-c3d59671/download",
     "block": "201_FURNITURE_BLOCKS_COOKTOP_PLAN",
     "file": "cooktop-plan-cad-block-c3d59671.dxf"
    },
    "features": {
     "size_mm": {
      "short": 520,
      "long": 600
     },
     "aspect": 1.15,
     "hist": {
      "LWPOLYLINE": 1,
      "CIRCLE": 4
     },
     "arc_share": 0.8,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 5
    }
   },
   {
    "origin": "measured",
    "label": "食洗機（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/dishwasher-plan-cad-block-6bc2b01b/download",
     "block": "201_FURNITURE_BLOCKS_DISHWASHER_PLAN",
     "file": "dishwasher-plan-cad-block-6bc2b01b.dxf"
    },
    "features": {
     "size_mm": {
      "short": 600,
      "long": 600
     },
     "aspect": 1,
     "hist": {
      "LWPOLYLINE": 3,
      "CIRCLE": 3
     },
     "arc_share": 0.5,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 6
    }
   },
   {
    "origin": "measured",
    "label": "電子レンジ（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/microwave-plan-cad-block-1316c7ff/download",
     "block": "201_FURNITURE_BLOCKS_MICROWAVE_PLAN",
     "file": "microwave-plan-cad-block-1316c7ff.dxf"
    },
    "features": {
     "size_mm": {
      "short": 420,
      "long": 520
     },
     "aspect": 1.24,
     "hist": {
      "LWPOLYLINE": 3
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 3
    }
   },
   {
    "origin": "measured",
    "label": "レンジクッカー（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/range-cooker-plan-cad-block-c5e040b1/download",
     "block": "201_FURNITURE_BLOCKS_RANGE_COOKER_PLAN",
     "file": "range-cooker-plan-cad-block-c5e040b1.dxf"
    },
    "features": {
     "size_mm": {
      "short": 600,
      "long": 650
     },
     "aspect": 1.08,
     "hist": {
      "LWPOLYLINE": 3,
      "CIRCLE": 4
     },
     "arc_share": 0.57,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 7
    }
   },
   {
    "origin": "measured",
    "label": "冷蔵庫（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/refrigerator-plan-cad-block-326c85c5/download",
     "block": "201_FURNITURE_BLOCKS_REFRIGERATOR_PLAN",
     "file": "refrigerator-plan-cad-block-326c85c5.dxf"
    },
    "features": {
     "size_mm": {
      "short": 650,
      "long": 680
     },
     "aspect": 1.05,
     "hist": {
      "LWPOLYLINE": 11
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 11
    }
   },
   {
    "origin": "measured",
    "label": "冷蔵庫・大型（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/tall-refrigerator-freezer-plan-cad-block-6899be3e/download",
     "block": "201_FURNITURE_BLOCKS_TALL_REFRIGERATOR_FREEZER_PLAN",
     "file": "tall-refrigerator-freezer-plan-cad-block-6899be3e.dxf"
    },
    "features": {
     "size_mm": {
      "short": 700,
      "long": 700
     },
     "aspect": 1,
     "hist": {
      "LWPOLYLINE": 11
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 11
    }
   },
   {
    "origin": "measured",
    "label": "冷蔵庫・カウンター下（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/under-counter-refrigerator-plan-cad-block-e1644e04/download",
     "block": "201_FURNITURE_BLOCKS_UNDER_COUNTER_REFRIGERATOR_PLAN",
     "file": "under-counter-refrigerator-plan-cad-block-e1644e04.dxf"
    },
    "features": {
     "size_mm": {
      "short": 550,
      "long": 600
     },
     "aspect": 1.09,
     "hist": {
      "LWPOLYLINE": 9
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 9
    }
   },
   {
    "origin": "measured",
    "label": "壁掛けオーブン（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/wall-oven-plan-cad-block-916d22ec/download",
     "block": "201_FURNITURE_BLOCKS_WALL_OVEN_PLAN",
     "file": "wall-oven-plan-cad-block-916d22ec.dxf"
    },
    "features": {
     "size_mm": {
      "short": 550,
      "long": 600
     },
     "aspect": 1.09,
     "hist": {
      "LWPOLYLINE": 3
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 3
    }
   },
   {
    "origin": "measured",
    "label": "洗濯機（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/washing-machine-plan-cad-block-0fe41000/download",
     "block": "201_FURNITURE_BLOCKS_WASHING_MACHINE_PLAN",
     "file": "washing-machine-plan-cad-block-0fe41000.dxf"
    },
    "features": {
     "size_mm": {
      "short": 600,
      "long": 600
     },
     "aspect": 1,
     "hist": {
      "LWPOLYLINE": 1,
      "CIRCLE": 2
     },
     "arc_share": 0.67,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 3
    }
   }
  ]
 },
 {
  "category": "ソファ",
  "kind": "家具",
  "patterns": [
   {
    "origin": "measured",
    "label": "L字（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/l-sectional-sofa-plan-cad-block-7fedf660/download",
     "block": "201_FURNITURE_BLOCKS_L_SECTIONAL_SOFA_PLAN",
     "file": "l-sectional-sofa-plan-cad-block-7fedf660.dxf"
    },
    "features": {
     "size_mm": {
      "short": 2150,
      "long": 2850
     },
     "aspect": 1.33,
     "hist": {
      "LWPOLYLINE": 7
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 7
    }
   },
   {
    "origin": "measured",
    "label": "オットマン（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/ottoman-plan-cad-block-1e7eb8f9/download",
     "block": "201_FURNITURE_BLOCKS_OTTOMAN_PLAN",
     "file": "ottoman-plan-cad-block-1e7eb8f9.dxf"
    },
    "features": {
     "size_mm": {
      "short": 550,
      "long": 650
     },
     "aspect": 1.18,
     "hist": {
      "LWPOLYLINE": 2
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": false,
     "n_entities": 2
    }
   },
   {
    "origin": "measured",
    "label": "リクライニングチェア（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/recliner-plan-cad-block-bb2d2c86/download",
     "block": "201_FURNITURE_BLOCKS_RECLINER_PLAN",
     "file": "recliner-plan-cad-block-bb2d2c86.dxf"
    },
    "features": {
     "size_mm": {
      "short": 850,
      "long": 1430
     },
     "aspect": 1.68,
     "hist": {
      "LWPOLYLINE": 4
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 4
    }
   },
   {
    "origin": "measured",
    "label": "3人掛け（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/three-seat-sofa-plan-cad-block-4517f70b/download",
     "block": "201_FURNITURE_BLOCKS_THREE_SEAT_SOFA_PLAN",
     "file": "three-seat-sofa-plan-cad-block-4517f70b.dxf"
    },
    "features": {
     "size_mm": {
      "short": 950,
      "long": 2200
     },
     "aspect": 2.32,
     "hist": {
      "LWPOLYLINE": 5
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 5
    }
   },
   {
    "origin": "measured",
    "label": "2人掛け（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/two-seat-sofa-plan-cad-block-510966fe/download",
     "block": "201_FURNITURE_BLOCKS_TWO_SEAT_SOFA_PLAN",
     "file": "two-seat-sofa-plan-cad-block-510966fe.dxf"
    },
    "features": {
     "size_mm": {
      "short": 950,
      "long": 1650
     },
     "aspect": 1.74,
     "hist": {
      "LWPOLYLINE": 4
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 4
    }
   }
  ]
 },
 {
  "category": "シャワー",
  "kind": "衛生器具",
  "patterns": [
   {
    "origin": "measured",
    "label": "シャワートレー（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/shower-tray-plan-cad-block-ed3e609f/download",
     "block": "201_FURNITURE_BLOCKS_SHOWER_TRAY_PLAN",
     "file": "shower-tray-plan-cad-block-ed3e609f.dxf"
    },
    "features": {
     "size_mm": {
      "short": 900,
      "long": 900
     },
     "aspect": 1,
     "hist": {
      "LWPOLYLINE": 6,
      "CIRCLE": 1
     },
     "arc_share": 0.14,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 7
    }
   }
  ]
 },
 {
  "category": "流し・SK",
  "kind": "衛生器具",
  "patterns": [
   {
    "origin": "measured",
    "label": "掃除流し（CC0実測）",
    "source": {
     "license": "CC0 1.0",
     "ref": "https://www.innerscene.com/api/library/utility-sink-plan-cad-block-42e8de44/download",
     "block": "201_FURNITURE_BLOCKS_UTILITY_SINK_PLAN",
     "file": "utility-sink-plan-cad-block-42e8de44.dxf"
    },
    "features": {
     "size_mm": {
      "short": 550,
      "long": 600
     },
     "aspect": 1.09,
     "hist": {
      "LWPOLYLINE": 2,
      "ELLIPSE": 1,
      "CIRCLE": 1
     },
     "arc_share": 0.5,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 4
    }
   }
  ]
 }
];

/* 特徴 f: { short, long, arcShare, closed, innerClosed, dividers }
 *  short/long は外形の短辺・長辺（mm）。dividers は内部の分割線の本数（数えられない時は null）。 */
function gateRange(v, range) { return v == null || range == null || (v >= range[0] && v <= range[1]); }

export function scorePattern(p, f) {
  /* 特徴が要るパターン（例：ベンチデスクは分割線の本数が条件）は、特徴が無い入力（器具の寸法だけの判定）では当てない */
  if (p.needs_features) for (const k of p.needs_features) if (f[k] == null) return null;
  if (p.origin === "measured") {
    const s = p.features.size_mm;
    const tolS = Math.max(18, s.short * 0.05), tolL = Math.max(18, s.long * 0.05);
    if (Math.abs(f.short - s.short) > tolS || Math.abs(f.long - s.long) > tolL) return null;
    if (f.arcShare != null && Math.abs(f.arcShare - p.features.arc_share) > 0.3) return null;
    if (f.closed != null && p.features.closed_outline != null && f.closed !== p.features.closed_outline) return null;
    if (f.innerClosed != null && p.features.inner_closed != null && f.innerClosed !== p.features.inner_closed) return null;
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
 * userDict（自分の辞書：利用者が「これは何か」を教えた { name, short, long } の配列）が最優先。
 *   寸法が実測パターンと同じ許容（±max(18mm, 5%)）で合えば、その名前で検出（mine: true）。
 * 戻り値: { verdict: "hit" | "near" | "unknown", category, score, short, long, mine? }（short/long は mm） */
export function classifyBox(b, userDict = []) {
  if (!b || b.length < 4) return { verdict: "unknown", category: null, score: 0, short: 0, long: 0 };
  const w = Math.abs(b[2] - b[0]) * 1000, h = Math.abs(b[3] - b[1]) * 1000;
  const short = Math.min(w, h), long = Math.max(w, h);
  for (const u of userDict || []) {
    if (!u || !u.name || !(u.short > 0) || !(u.long > 0)) continue;
    const tolS = Math.max(18, u.short * 0.05), tolL = Math.max(18, u.long * 0.05);
    if (Math.abs(short - u.short) <= tolS && Math.abs(long - u.long) <= tolL)
      return { verdict: "hit", category: u.name, score: 1, short, long, mine: true };
  }
  const r = classifySymbol({ short, long, arcShare: null, closed: null, innerClosed: null, dividers: null });
  if (r.result === "不明") return { verdict: "unknown", category: null, score: r.score, short, long };
  if (r.result === "要確認") return { verdict: "near", category: r.category, score: r.score, short, long };
  return { verdict: "hit", category: r.result, score: r.score, short, long };
}

/* 線の集まりから切り出した形（js/furndetect.js の候補）を判定する。
 * f: { short, long（mm）, arcShare, closed, dividers }。自分の辞書が最優先（寸法で照合）。
 * 戻り値は classifyBox と同じ形 */
export function classifyCluster(f, userDict = []) {
  const short = f && f.short, long = f && f.long;
  if (!(short > 0) || !(long > 0)) return { verdict: "unknown", category: null, score: 0, short: 0, long: 0 };
  for (const u of userDict || []) {
    if (!u || !u.name || !(u.short > 0) || !(u.long > 0)) continue;
    const tolS = Math.max(18, u.short * 0.05), tolL = Math.max(18, u.long * 0.05);
    if (Math.abs(short - u.short) <= tolS && Math.abs(long - u.long) <= tolL)
      return { verdict: "hit", category: u.name, score: 1, short, long, mine: true };
  }
  const r = classifySymbol({ short, long, arcShare: f.arcShare != null ? f.arcShare : null, closed: f.closed != null ? f.closed : null, innerClosed: null, dividers: f.dividers != null ? f.dividers : null });
  if (r.result === "不明") return { verdict: "unknown", category: null, score: r.score, short, long };
  if (r.result === "要確認") return { verdict: "near", category: r.category, score: r.score, short, long };
  return { verdict: "hit", category: r.result, score: r.score, short, long };
}

/* 戻り値: { result: カテゴリ名 | "要確認" | "不明", score, category, label } */
export function classifySymbol(f) {
  /* まずカテゴリごとの最良スコアに集約する（同じカテゴリのパターン同士は競合しない。
   * 集約しないと、同寸法のパターンを複数持つカテゴリが「僅差チェック」をすり抜けてしまう） */
  const byCat = new Map();
  for (const e of SYM_DICT) for (const p of e.patterns) {
    const s = scorePattern(p, f);
    if (s == null) continue;
    const cur = byCat.get(e.category);
    if (!cur || s > cur.score) byCat.set(e.category, { score: s, category: e.category, kind: e.kind, label: p.label || p.origin });
  }
  const hits = [...byCat.values()];
  hits.sort((a, b) => b.score - a.score);
  if (!hits.length || hits[0].score < SYM_THRESHOLD) return { result: "不明", score: hits.length ? hits[0].score : 0, category: null, label: null };
  if (hits.length > 1 && hits[0].category !== hits[1].category && hits[0].score - hits[1].score < 0.05)
    return { result: "要確認", score: hits[0].score, category: hits[0].category, label: hits[0].label };
  return { result: hits[0].category, score: hits[0].score, category: hits[0].category, label: hits[0].label };
}
