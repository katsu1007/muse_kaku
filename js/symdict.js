/* シンボル辞書（認識専用）— 図面の中の図形が「何であるか」を、幾何そのものではなく
 * 特徴（寸法・縦横比・円弧の割合・閉じているか・内側の閉曲線・分割線）で照合する。
 * 目的は図面の読み取り・解釈・認識だけ。メーカーの元データは使わず、
 * 一般化したルールパターンと、商用利用可能な素材（Innerscene=CC0 1.0、
 * nasji.com=商用利用可・帰属不要の表明、2026-11-19確認）の実測特徴だけでできている。
 * 出典は各パターンの source に記録。幾何そのものは保持しない。
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
   },
   {
    "origin": "rule",
    "label": "矩形外形＋ボウル（簡略記号）",
    "size_range_mm": {
     "short": [
      450,
      540
     ],
     "long": [
      550,
      680
     ]
    },
    "aspect_range": [
     1.1,
     1.4
    ],
    "primitives": {
     "arc_share": [
      0,
      0.12
     ],
     "closed_outline": true,
     "inner_closed": true,
     "divider_min": null,
     "straight_back": true
    },
    "notes": "簡略記号型：外形は矩形、ボウルは内側の閉じた円で描く描き方。平面表示記号（JIS A 0150 の流れ）の洋式便座の略し方と同型で、AIテスト図面 dxf_complex/07 の実測（外形500×600＋内円φ240）から一般化。実形の洋式（円弧の割合が大きい物）とは別物として、矩形＋内円のクラスタ専用（2026-11-24追加）"
   }
  ]
 },
 {
  "id": "wc-japanese",
  "category": "和式便器",
  "kind": "衛生器具",
  "patterns": [
   {
    "origin": "rule",
    "label": "和式（細長い楕円の鉢）",
    "size_range_mm": {
     "short": [
      200,
      360
     ],
     "long": [
      500,
      800
     ]
    },
    "aspect_range": [
     1.9,
     3.5
    ],
    "primitives": {
     "arc_share": [
      0.5,
      1
     ],
     "closed_outline": true,
     "inner_closed": null,
     "divider_min": null,
     "straight_back": false
    },
    "needs_features": [
     "arcShare"
    ],
    "notes": "寸法だけ（器具の外形の箱）では当てない：250×800 級の浅い箱（消火栓箱・浅型カウンター）と重なるため、曲線の割合が分かる候補（線のかたまり）にだけ当てる。器具の救済が形で和便器と決めた物は、符の表示で和式便器と出す（project.js の symList）。床に埋める和式の鉢。平面は細長い楕円（短い方20〜36cm・長い方50〜80cm・長さが幅の1.9倍以上）。隅付けのロータンク（三角・レバー付き）は鉢と別に描かれ、便器の一部なので数えない。2026-11-22 三井屋の現況図で、かつ（持ち主）が実物を確かめた（くらちゃん＝Claude が追加。寸法の帯は図面の形から測った値で、図形そのものは持たない）。洋式大便器の帯（幅350〜490）とは短い方が重ならない"
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
   },
   {
    "origin": "measured",
    "label": "nasji-urinal（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/bathroom/nasji-urinal",
     "block": "URINAL",
     "file": "bathroom__nasji-urinal.dxf"
    },
    "features": {
     "size_mm": {
      "short": 355.6,
      "long": 457.2
     },
     "aspect": 1.29,
     "hist": {
      "LINE": 11,
      "ELLIPSE": 2,
      "CIRCLE": 2,
      "LWPOLYLINE": 1
     },
     "arc_share": 0.25,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 16
    }
   },
   {
    "origin": "rule",
    "label": "小便器（内側鉢あり・JWW実図面）",
    "size_range_mm": {
     "short": [330, 430],
     "long": [380, 580]
    },
    "aspect_range": [1.0, 1.6],
    "primitives": {
     "arc_share": [0.5, 1],
     "closed_outline": true,
     "inner_closed": true,
     "divider_min": null,
     "straight_back": false
    },
    "needs_features": ["innerClosed"],
    "notes": "JWW実図面の小便器は内側の鉢（楕円）が閉じて描かれる（ジェイテクト370×503・三井屋380×509/380×410で実測）。旧ルール（inner_closed=false前提）は欧米ブロック由来で実図面では発火しないため、内側閉形を必須とする実図面向け署名を追加。寸法帯は実測3モデル＋REFERENCE（壁掛350〜410・ストール奥行420前後、描画は付属部込みで〜510）から一般化。発火はclassifyFixtureShapeの小便器証拠分岐（内側最大閉形の弧率≥0.55等）経由でのみ表示に効く。"
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
   },
   {
    "origin": "measured",
    "label": "nasji-sink-bath-rect（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/bathroom/nasji-sink-bath-rect",
     "block": "SINK-BATH-RECT",
     "file": "bathroom__nasji-sink-bath-rect.dxf"
    },
    "features": {
     "size_mm": {
      "short": 558.8,
      "long": 787.4
     },
     "aspect": 1.41,
     "hist": {
      "LWPOLYLINE": 3,
      "LINE": 16,
      "ARC": 8,
      "CIRCLE": 2
     },
     "arc_share": 0.34,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 29
    }
   },
   {
    "origin": "measured",
    "label": "nasji-sink-bath-rnd（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/bathroom/nasji-sink-bath-rnd",
     "block": "SINK-BATH-RND",
     "file": "bathroom__nasji-sink-bath-rnd.dxf"
    },
    "features": {
     "size_mm": {
      "short": 558.8,
      "long": 736.6
     },
     "aspect": 1.32,
     "hist": {
      "LWPOLYLINE": 3,
      "CIRCLE": 4,
      "LINE": 8
     },
     "arc_share": 0.27,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 15
    }
   },
   {
    "origin": "measured",
    "label": "nasji-sink-comp-1（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/bathroom/nasji-sink-comp-1",
     "block": "SINK-COMP-1",
     "file": "bathroom__nasji-sink-comp-1.dxf"
    },
    "features": {
     "size_mm": {
      "short": 508,
      "long": 609.6
     },
     "aspect": 1.2,
     "hist": {
      "LWPOLYLINE": 3,
      "LINE": 17,
      "ARC": 8,
      "CIRCLE": 2
     },
     "arc_share": 0.33,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 30
    }
   },
   {
    "origin": "measured",
    "label": "nasji-sink-comp-3（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/bathroom/nasji-sink-comp-3",
     "block": "SINK-COMP-3",
     "file": "bathroom__nasji-sink-comp-3.dxf"
    },
    "features": {
     "size_mm": {
      "short": 609.6,
      "long": 2438.4
     },
     "aspect": 4,
     "hist": {
      "LWPOLYLINE": 9,
      "LINE": 47,
      "ARC": 24,
      "CIRCLE": 6
     },
     "arc_share": 0.35,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 86
    }
   },
   {
    "origin": "measured",
    "label": "nasji-sink-corner（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/bathroom/nasji-sink-corner",
     "block": "SINK-CORNER",
     "file": "bathroom__nasji-sink-corner.dxf"
    },
    "features": {
     "size_mm": {
      "short": 609.6,
      "long": 609.6
     },
     "aspect": 1,
     "hist": {
      "LWPOLYLINE": 3,
      "LINE": 16,
      "ARC": 8,
      "CIRCLE": 2
     },
     "arc_share": 0.34,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 29
    }
   },
   {
    "origin": "measured",
    "label": "rectangular-washbasin-plan（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/bathroom/rectangular-washbasin-plan",
     "block": "A$C7CEF525E",
     "file": "bathroom__rectangular-washbasin-plan.dxf"
    },
    "features": {
     "size_mm": {
      "short": 430,
      "long": 570
     },
     "aspect": 1.33,
     "hist": {
      "LINE": 15,
      "ARC": 6,
      "CIRCLE": 4,
      "LWPOLYLINE": 1
     },
     "arc_share": 0.38,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 26
    }
   },
   {
    "origin": "rule",
    "label": "矩形カウンター＋ボウル（簡略記号）",
    "size_range_mm": {
     "short": [
      460,
      560
     ],
     "long": [
      540,
      660
     ]
    },
    "aspect_range": [
     1.05,
     1.35
    ],
    "primitives": {
     "arc_share": [
      0,
      0.12
     ],
     "closed_outline": true,
     "inner_closed": true,
     "divider_min": null,
     "straight_back": true
    },
    "notes": "簡略記号型：矩形カウンター＋楕円ボウル。AIテスト図面 dxf_complex/07 の実測（外形600×500＋内楕円440×264）から一般化。寸法帯は JIS A 5207 の洗面器の大きさ（自治体機材標準図・広島市 令和7年度版：幅450〜610・奥行450〜480級）とも整合（2026-11-24追加）"
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
   },
   {
    "origin": "measured",
    "label": "l-shaped-computer-desk-plan（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/l-shaped-computer-desk-plan",
     "block": "A$C6FC27815",
     "file": "furniture__l-shaped-computer-desk-plan.dxf"
    },
    "features": {
     "size_mm": {
      "short": 2010,
      "long": 2210
     },
     "aspect": 1.1,
     "hist": {
      "LINE": 230,
      "ARC": 22,
      "CIRCLE": 5,
      "LWPOLYLINE": 5
     },
     "arc_share": 0.1,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 262
    }
   },
   {
    "origin": "measured",
    "label": "nasji-classroom-desk（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/nasji-classroom-desk",
     "block": "CLASSROOM-DESK",
     "file": "furniture__nasji-classroom-desk.dxf"
    },
    "features": {
     "size_mm": {
      "short": 508,
      "long": 609.6
     },
     "aspect": 1.2,
     "hist": {
      "LWPOLYLINE": 3,
      "LINE": 2
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 5
    }
   },
   {
    "origin": "measured",
    "label": "nasji-coffee-table-48x24（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/nasji-coffee-table-48x24",
     "block": "COFFEE-TABLE-48X24",
     "file": "furniture__nasji-coffee-table-48x24.dxf"
    },
    "features": {
     "size_mm": {
      "short": 609.6,
      "long": 1219.2
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
    "label": "nasji-coffee-table-oval-48x26（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/nasji-coffee-table-oval-48x26",
     "block": "COFFEE-TABLE-OVAL-48X26",
     "file": "furniture__nasji-coffee-table-oval-48x26.dxf"
    },
    "features": {
     "size_mm": {
      "short": 660.4,
      "long": 1219.2
     },
     "aspect": 1.85,
     "hist": {
      "ELLIPSE": 3
     },
     "arc_share": 1,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 3
    }
   },
   {
    "origin": "measured",
    "label": "nasji-conference-table-10（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/nasji-conference-table-10",
     "block": "CONFERENCE-TABLE-10",
     "file": "furniture__nasji-conference-table-10.dxf"
    },
    "features": {
     "size_mm": {
      "short": 1219.2,
      "long": 3048
     },
     "aspect": 2.5,
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
    "label": "nasji-conference-table-12（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/nasji-conference-table-12",
     "block": "CONFERENCE-TABLE-12",
     "file": "furniture__nasji-conference-table-12.dxf"
    },
    "features": {
     "size_mm": {
      "short": 1371.6,
      "long": 3657.6
     },
     "aspect": 2.67,
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
    "label": "nasji-conference-table-6（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/nasji-conference-table-6",
     "block": "CONFERENCE-TABLE-6",
     "file": "furniture__nasji-conference-table-6.dxf"
    },
    "features": {
     "size_mm": {
      "short": 914.4,
      "long": 1828.8
     },
     "aspect": 2,
     "hist": {
      "LWPOLYLINE": 3,
      "CIRCLE": 2
     },
     "arc_share": 0.4,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 5
    }
   },
   {
    "origin": "measured",
    "label": "nasji-conference-table-8（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/nasji-conference-table-8",
     "block": "CONFERENCE-TABLE-8",
     "file": "furniture__nasji-conference-table-8.dxf"
    },
    "features": {
     "size_mm": {
      "short": 1219.2,
      "long": 2438.4
     },
     "aspect": 2,
     "hist": {
      "LWPOLYLINE": 3,
      "CIRCLE": 2
     },
     "arc_share": 0.4,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 5
    }
   },
   {
    "origin": "measured",
    "label": "nasji-desk-60x30（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/nasji-desk-60x30",
     "block": "DESK-60X30",
     "file": "furniture__nasji-desk-60x30.dxf"
    },
    "features": {
     "size_mm": {
      "short": 762,
      "long": 1524
     },
     "aspect": 2,
     "hist": {
      "LWPOLYLINE": 3,
      "LINE": 5,
      "CIRCLE": 2
     },
     "arc_share": 0.2,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 10
    }
   },
   {
    "origin": "measured",
    "label": "nasji-lab-bench-72（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/nasji-lab-bench-72",
     "block": "LAB-BENCH-72",
     "file": "furniture__nasji-lab-bench-72.dxf"
    },
    "features": {
     "size_mm": {
      "short": 762,
      "long": 1828.8
     },
     "aspect": 2.4,
     "hist": {
      "LWPOLYLINE": 2,
      "LINE": 4,
      "CIRCLE": 2
     },
     "arc_share": 0.25,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 8
    }
   },
   {
    "origin": "measured",
    "label": "nasji-table-30x48（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/nasji-table-30x48",
     "block": "TABLE-30X48",
     "file": "furniture__nasji-table-30x48.dxf"
    },
    "features": {
     "size_mm": {
      "short": 762,
      "long": 1219.2
     },
     "aspect": 1.6,
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
    "label": "nasji-table-oval-42x84（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/nasji-table-oval-42x84",
     "block": "TABLE-OVAL-42X84",
     "file": "furniture__nasji-table-oval-42x84.dxf"
    },
    "features": {
     "size_mm": {
      "short": 1066.8,
      "long": 2133.6
     },
     "aspect": 2,
     "hist": {
      "LWPOLYLINE": 9,
      "LINE": 2
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 11
    }
   },
   {
    "origin": "measured",
    "label": "nasji-workbench-72（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/nasji-workbench-72",
     "block": "WORKBENCH-72",
     "file": "furniture__nasji-workbench-72.dxf"
    },
    "features": {
     "size_mm": {
      "short": 609.6,
      "long": 1828.8
     },
     "aspect": 3,
     "hist": {
      "LWPOLYLINE": 5,
      "LINE": 3
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 8
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
   },
   {
    "origin": "measured",
    "label": "nasji-fitting-bench-42（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/bathroom/nasji-fitting-bench-42",
     "block": "FITTING-BENCH-42",
     "file": "bathroom__nasji-fitting-bench-42.dxf"
    },
    "features": {
     "size_mm": {
      "short": 508,
      "long": 1066.8
     },
     "aspect": 2.1,
     "hist": {
      "LWPOLYLINE": 1,
      "LINE": 6
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": false,
     "n_entities": 7
    }
   },
   {
    "origin": "measured",
    "label": "angular-upholstered-armchair-plan（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/angular-upholstered-armchair-plan",
     "block": "A$C7EC567CE",
     "file": "furniture__angular-upholstered-armchair-plan.dxf"
    },
    "features": {
     "size_mm": {
      "short": 1202.1,
      "long": 1328.6
     },
     "aspect": 1.11,
     "hist": {
      "LINE": 7,
      "ARC": 4,
      "LWPOLYLINE": 1
     },
     "arc_share": 0.33,
     "closed_outline": true,
     "inner_closed": false,
     "n_entities": 12
    }
   },
   {
    "origin": "measured",
    "label": "curved-back-dining-chair-plan（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/curved-back-dining-chair-plan",
     "block": "A$C29F5351B",
     "file": "furniture__curved-back-dining-chair-plan.dxf"
    },
    "features": {
     "size_mm": {
      "short": 403.1,
      "long": 674.7
     },
     "aspect": 1.67,
     "hist": {
      "LINE": 6,
      "ARC": 4,
      "LWPOLYLINE": 2
     },
     "arc_share": 0.33,
     "closed_outline": true,
     "inner_closed": false,
     "n_entities": 12
    }
   },
   {
    "origin": "measured",
    "label": "detailed-salon-chair-plan（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/detailed-salon-chair-plan",
     "block": "A$C04B47921",
     "file": "furniture__detailed-salon-chair-plan.dxf"
    },
    "features": {
     "size_mm": {
      "short": 562,
      "long": 1443.3
     },
     "aspect": 2.57,
     "hist": {
      "LINE": 57,
      "LWPOLYLINE": 18,
      "ARC": 51,
      "CIRCLE": 1
     },
     "arc_share": 0.41,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 127
    }
   },
   {
    "origin": "measured",
    "label": "five-star-swivel-office-chair-plan（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/five-star-swivel-office-chair-plan",
     "block": "A$C649664E4",
     "file": "furniture__five-star-swivel-office-chair-plan.dxf"
    },
    "features": {
     "size_mm": {
      "short": 487.4,
      "long": 856.4
     },
     "aspect": 1.76,
     "hist": {
      "LINE": 9,
      "ARC": 17,
      "CIRCLE": 1,
      "LWPOLYLINE": 5
     },
     "arc_share": 0.56,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 32
    }
   },
   {
    "origin": "measured",
    "label": "nasji-armchair-30（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/nasji-armchair-30",
     "block": "ARMCHAIR-30",
     "file": "furniture__nasji-armchair-30.dxf"
    },
    "features": {
     "size_mm": {
      "short": 762,
      "long": 812.8
     },
     "aspect": 1.07,
     "hist": {
      "LWPOLYLINE": 5,
      "LINE": 2
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 7
    }
   },
   {
    "origin": "measured",
    "label": "nasji-chair-dining（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/nasji-chair-dining",
     "block": "CHAIR-DINING",
     "file": "furniture__nasji-chair-dining.dxf"
    },
    "features": {
     "size_mm": {
      "short": 457.2,
      "long": 529.2
     },
     "aspect": 1.16,
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
    "label": "ornate-upholstered-armchair-plan（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/ornate-upholstered-armchair-plan",
     "block": "A$C7B1448BC",
     "file": "furniture__ornate-upholstered-armchair-plan.dxf"
    },
    "features": {
     "size_mm": {
      "short": 428.2,
      "long": 768.8
     },
     "aspect": 1.8,
     "hist": {
      "LINE": 1,
      "LWPOLYLINE": 66
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 67
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
   },
   {
    "origin": "measured",
    "label": "nasji-bookshelf-48x12（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/nasji-bookshelf-48x12",
     "block": "BOOKSHELF-48X12",
     "file": "furniture__nasji-bookshelf-48x12.dxf"
    },
    "features": {
     "size_mm": {
      "short": 304.8,
      "long": 1219.2
     },
     "aspect": 4,
     "hist": {
      "LWPOLYLINE": 2,
      "LINE": 12
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 14
    }
   },
   {
    "origin": "measured",
    "label": "nasji-bookshelf-72x12（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/nasji-bookshelf-72x12",
     "block": "BOOKSHELF-72X12",
     "file": "furniture__nasji-bookshelf-72x12.dxf"
    },
    "features": {
     "size_mm": {
      "short": 304.8,
      "long": 1828.8
     },
     "aspect": 6,
     "hist": {
      "LWPOLYLINE": 2,
      "LINE": 18
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": false,
     "n_entities": 20
    }
   },
   {
    "origin": "measured",
    "label": "nasji-closet-rod-shelf-72（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/nasji-closet-rod-shelf-72",
     "block": "CLOSET-ROD-SHELF-72",
     "file": "furniture__nasji-closet-rod-shelf-72.dxf"
    },
    "features": {
     "size_mm": {
      "short": 609.6,
      "long": 1828.8
     },
     "aspect": 3,
     "hist": {
      "LWPOLYLINE": 1,
      "LINE": 16
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": false,
     "n_entities": 17
    }
   },
   {
    "origin": "measured",
    "label": "nasji-closet-rod-shelf-84（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/nasji-closet-rod-shelf-84",
     "block": "CLOSET-ROD-SHELF-84",
     "file": "furniture__nasji-closet-rod-shelf-84.dxf"
    },
    "features": {
     "size_mm": {
      "short": 609.6,
      "long": 2133.6
     },
     "aspect": 3.5,
     "hist": {
      "LWPOLYLINE": 1,
      "LINE": 18
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": false,
     "n_entities": 19
    }
   },
   {
    "origin": "measured",
    "label": "nasji-closet-rod-shelf-96（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/nasji-closet-rod-shelf-96",
     "block": "CLOSET-ROD-SHELF-96",
     "file": "furniture__nasji-closet-rod-shelf-96.dxf"
    },
    "features": {
     "size_mm": {
      "short": 609.6,
      "long": 2438.4
     },
     "aspect": 4,
     "hist": {
      "LWPOLYLINE": 1,
      "LINE": 20
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": false,
     "n_entities": 21
    }
   },
   {
    "origin": "measured",
    "label": "nasji-dresser-60（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/nasji-dresser-60",
     "block": "DRESSER-60",
     "file": "furniture__nasji-dresser-60.dxf"
    },
    "features": {
     "size_mm": {
      "short": 508,
      "long": 1524
     },
     "aspect": 3,
     "hist": {
      "LWPOLYLINE": 2,
      "LINE": 6
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": false,
     "n_entities": 8
    }
   },
   {
    "origin": "measured",
    "label": "nasji-file-cabinet（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/nasji-file-cabinet",
     "block": "FILE-CABINET",
     "file": "furniture__nasji-file-cabinet.dxf"
    },
    "features": {
     "size_mm": {
      "short": 381,
      "long": 1209
     },
     "aspect": 3.17,
     "hist": {
      "LWPOLYLINE": 3,
      "LINE": 4
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 7
    }
   },
   {
    "origin": "measured",
    "label": "nasji-garage-storage-cabinet-36（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/nasji-garage-storage-cabinet-36",
     "block": "GARAGE-STORAGE-CABINET-36",
     "file": "furniture__nasji-garage-storage-cabinet-36.dxf"
    },
    "features": {
     "size_mm": {
      "short": 609.6,
      "long": 914.4
     },
     "aspect": 1.5,
     "hist": {
      "LWPOLYLINE": 2,
      "LINE": 6
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": false,
     "n_entities": 8
    }
   },
   {
    "origin": "measured",
    "label": "nasji-nightstand（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/nasji-nightstand",
     "block": "NIGHTSTAND",
     "file": "furniture__nasji-nightstand.dxf"
    },
    "features": {
     "size_mm": {
      "short": 457.2,
      "long": 558.8
     },
     "aspect": 1.22,
     "hist": {
      "LWPOLYLINE": 2,
      "LINE": 2
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": false,
     "n_entities": 4
    }
   },
   {
    "origin": "measured",
    "label": "nasji-pass-shelf-48（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/kitchen/nasji-pass-shelf-48",
     "block": "PASS-SHELF-48",
     "file": "kitchen__nasji-pass-shelf-48.dxf"
    },
    "features": {
     "size_mm": {
      "short": 355.6,
      "long": 1219.2
     },
     "aspect": 3.43,
     "hist": {
      "LWPOLYLINE": 1,
      "LINE": 4
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": false,
     "n_entities": 5
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
   },
   {
    "origin": "measured",
    "label": "nasji-tub（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/bathroom/nasji-tub",
     "block": "TUB",
     "file": "bathroom__nasji-tub.dxf"
    },
    "features": {
     "size_mm": {
      "short": 762,
      "long": 1524
     },
     "aspect": 2,
     "hist": {
      "LWPOLYLINE": 1,
      "LINE": 6,
      "ARC": 4,
      "CIRCLE": 3
     },
     "arc_share": 0.5,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 14
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
   },
   {
    "origin": "measured",
    "label": "nasji-bed-king（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/nasji-bed-king",
     "block": "BED-KING",
     "file": "furniture__nasji-bed-king.dxf"
    },
    "features": {
     "size_mm": {
      "short": 1930.4,
      "long": 2032
     },
     "aspect": 1.05,
     "hist": {
      "LWPOLYLINE": 5,
      "LINE": 5
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 10
    }
   },
   {
    "origin": "measured",
    "label": "nasji-bed（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/nasji-bed",
     "block": "BED",
     "file": "furniture__nasji-bed.dxf"
    },
    "features": {
     "size_mm": {
      "short": 1524,
      "long": 2108.2
     },
     "aspect": 1.38,
     "hist": {
      "LWPOLYLINE": 5,
      "LINE": 5
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 10
    }
   },
   {
    "origin": "measured",
    "label": "nasji-daybed-75x39（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/nasji-daybed-75x39",
     "block": "DAYBED-75X39",
     "file": "furniture__nasji-daybed-75x39.dxf"
    },
    "features": {
     "size_mm": {
      "short": 990.6,
      "long": 1905
     },
     "aspect": 1.92,
     "hist": {
      "LWPOLYLINE": 5,
      "LINE": 4
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 9
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
   },
   {
    "origin": "measured",
    "label": "built-in-oven-plan-symbol（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/kitchen/built-in-oven-plan-symbol",
     "block": "\\U+70E4\\U+7BB1",
     "file": "kitchen__built-in-oven-plan-symbol.dxf"
    },
    "features": {
     "size_mm": {
      "short": 727.1,
      "long": 885.5
     },
     "aspect": 1.22,
     "hist": {
      "LINE": 22,
      "ARC": 4
     },
     "arc_share": 0.15,
     "closed_outline": false,
     "inner_closed": false,
     "n_entities": 26
    }
   },
   {
    "origin": "measured",
    "label": "nasji-cooktop-30（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/kitchen/nasji-cooktop-30",
     "block": "COOKTOP-30",
     "file": "kitchen__nasji-cooktop-30.dxf"
    },
    "features": {
     "size_mm": {
      "short": 533.4,
      "long": 762
     },
     "aspect": 1.43,
     "hist": {
      "LWPOLYLINE": 2,
      "LINE": 9,
      "CIRCLE": 12
     },
     "arc_share": 0.52,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 23
    }
   },
   {
    "origin": "measured",
    "label": "nasji-microwave（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/kitchen/nasji-microwave",
     "block": "MICROWAVE",
     "file": "kitchen__nasji-microwave.dxf"
    },
    "features": {
     "size_mm": {
      "short": 457.2,
      "long": 609.6
     },
     "aspect": 1.33,
     "hist": {
      "LWPOLYLINE": 2,
      "LINE": 4,
      "CIRCLE": 1
     },
     "arc_share": 0.14,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 7
    }
   },
   {
    "origin": "measured",
    "label": "nasji-range-30（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/kitchen/nasji-range-30",
     "block": "RANGE-30",
     "file": "kitchen__nasji-range-30.dxf"
    },
    "features": {
     "size_mm": {
      "short": 635,
      "long": 762
     },
     "aspect": 1.2,
     "hist": {
      "LWPOLYLINE": 2,
      "LINE": 10,
      "CIRCLE": 12
     },
     "arc_share": 0.5,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 24
    }
   },
   {
    "origin": "measured",
    "label": "nasji-range-commercial-36（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/kitchen/nasji-range-commercial-36",
     "block": "RANGE-COMMERCIAL-36",
     "file": "kitchen__nasji-range-commercial-36.dxf"
    },
    "features": {
     "size_mm": {
      "short": 812.8,
      "long": 914.4
     },
     "aspect": 1.12,
     "hist": {
      "LWPOLYLINE": 2,
      "LINE": 15,
      "CIRCLE": 12
     },
     "arc_share": 0.41,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 29
    }
   },
   {
    "origin": "rule",
    "label": "流し台（長大・奥行600級）",
    "scope": "dims",
    "size_range_mm": {
     "short": [520, 680],
     "long": [3000, 3900]
    },
    "aspect_range": [4.4, 7.5],
    "primitives": {
     "arc_share": [0, 0.35],
     "closed_outline": true,
     "inner_closed": null,
     "divider_min": null,
     "straight_back": false
    },
    "notes": "業務用ステンレス流し台の平面署名。奥行は流し台の標準600（REFERENCE: 奥行550〜700・150の倍数系）から520〜680、長さは洗面カウンターの実測上限（〜2400）と分かれる3000以上に置く（ジェイテクトのステンレス流し台600×3600で実測・利用者確認済み）。ボウルが描かれない略図でも寸法だけで拾えるよう inner_closed は要求しない。器具表示では上限ルールにより類似どまり（確定はしない）。scope＝dims で寸法だけの候補（器具の箱）に限定し、線の特徴が分かるクラスタには当てない（江南の長大な帯状クラスタ660×3385等が机から流し台に化けるのを防ぐ。実測で確認済み）。"
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
   },
   {
    "origin": "measured",
    "label": "compact-two-seat-loveseat-plan（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/compact-two-seat-loveseat-plan",
     "block": "A$C7C1D08AD",
     "file": "furniture__compact-two-seat-loveseat-plan.dxf"
    },
    "features": {
     "size_mm": {
      "short": 992.8,
      "long": 1281
     },
     "aspect": 1.29,
     "hist": {
      "LINE": 18,
      "ARC": 4
     },
     "arc_share": 0.18,
     "closed_outline": false,
     "inner_closed": false,
     "n_entities": 22
    }
   },
   {
    "origin": "measured",
    "label": "nasji-sectional-l-96（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/furniture/nasji-sectional-l-96",
     "block": "SECTIONAL-L-96",
     "file": "furniture__nasji-sectional-l-96.dxf"
    },
    "features": {
     "size_mm": {
      "short": 2438.4,
      "long": 2438.4
     },
     "aspect": 1,
     "hist": {
      "LWPOLYLINE": 6,
      "LINE": 7
     },
     "arc_share": 0,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 13
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
   },
   {
    "origin": "measured",
    "label": "nasji-floor-sink（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/bathroom/nasji-floor-sink",
     "block": "FLOOR-SINK",
     "file": "bathroom__nasji-floor-sink.dxf"
    },
    "features": {
     "size_mm": {
      "short": 304.8,
      "long": 304.8
     },
     "aspect": 1,
     "hist": {
      "LWPOLYLINE": 2,
      "LINE": 4,
      "CIRCLE": 1
     },
     "arc_share": 0.14,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 7
    }
   },
   {
    "origin": "measured",
    "label": "nasji-sink-kitchen-dbl（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/bathroom/nasji-sink-kitchen-dbl",
     "block": "SINK-KITCHEN-DBL",
     "file": "bathroom__nasji-sink-kitchen-dbl.dxf"
    },
    "features": {
     "size_mm": {
      "short": 558.8,
      "long": 838.2
     },
     "aspect": 1.5,
     "hist": {
      "LWPOLYLINE": 4,
      "LINE": 26,
      "ARC": 16,
      "CIRCLE": 4
     },
     "arc_share": 0.4,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 50
    }
   },
   {
    "origin": "measured",
    "label": "nasji-sink-kitchen-sgl（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/bathroom/nasji-sink-kitchen-sgl",
     "block": "SINK-KITCHEN-SGL",
     "file": "bathroom__nasji-sink-kitchen-sgl.dxf"
    },
    "features": {
     "size_mm": {
      "short": 558.8,
      "long": 762
     },
     "aspect": 1.36,
     "hist": {
      "LWPOLYLINE": 4,
      "LINE": 16,
      "ARC": 8,
      "CIRCLE": 2
     },
     "arc_share": 0.33,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 30
    }
   },
   {
    "origin": "measured",
    "label": "nasji-sink-mop（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/bathroom/nasji-sink-mop",
     "block": "SINK-MOP",
     "file": "bathroom__nasji-sink-mop.dxf"
    },
    "features": {
     "size_mm": {
      "short": 609.6,
      "long": 609.6
     },
     "aspect": 1,
     "hist": {
      "LWPOLYLINE": 3,
      "LINE": 16,
      "ARC": 8,
      "CIRCLE": 2
     },
     "arc_share": 0.34,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 29
    }
   },
   {
    "origin": "measured",
    "label": "double-bowl-kitchen-sink-plan（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/kitchen/double-bowl-kitchen-sink-plan",
     "block": "A$C678E413C",
     "file": "kitchen__double-bowl-kitchen-sink-plan.dxf"
    },
    "features": {
     "size_mm": {
      "short": 815,
      "long": 865.3
     },
     "aspect": 1.06,
     "hist": {
      "LINE": 37,
      "CIRCLE": 5,
      "ARC": 36
     },
     "arc_share": 0.53,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 78
    }
   },
   {
    "origin": "measured",
    "label": "unequal-double-bowl-sink-plan（nasji実測）",
    "source": {
     "license": "Free for commercial use (nasji.com FAQ, 2026-11-19確認)",
     "ref": "https://nasji.com/cad-blocks/kitchen/unequal-double-bowl-sink-plan",
     "block": "A$C30C52308",
     "file": "kitchen__unequal-double-bowl-sink-plan.dxf"
    },
    "features": {
     "size_mm": {
      "short": 450,
      "long": 815
     },
     "aspect": 1.81,
     "hist": {
      "LINE": 35,
      "CIRCLE": 5,
      "ARC": 36
     },
     "arc_share": 0.54,
     "closed_outline": true,
     "inner_closed": true,
     "n_entities": 76
    }
   }
  ]
 },
 {
  "id": "hydrant",
  "category": "消火栓",
  "kind": "設備",
  "patterns": [
   {
    "origin": "rule",
    "label": "屋内消火栓箱（標準寸法）",
    "size_range_mm": {
     "short": [
      200,
      300
     ],
     "long": [
      600,
      1100
     ]
    },
    "aspect_range": [
     2,
     5.5
    ],
    "primitives": {
     "arc_share": [
      0,
      0.3
     ],
     "closed_outline": true,
     "inner_closed": null,
     "divider_min": null,
     "straight_back": true
    },
    "needs_features": [
     "arcShare"
    ],
    "notes": "国交省「公共建築設備工事標準図（機械設備工事編）」の機材標準寸法：HB-1 幅700〜800×奥行200〜300、HB-4 幅600〜900×奥行200〜250、消火器箱併設形 幅900〜1,100×奥行200〜300。廊下壁際の浅い箱で、部屋・収納と誤らないために置く（2026-11-21 Web参照基準から追加。寸法という事実のみで、幾何は取り込んでいない）。寸法だけでは浅型カウンター洗面（600×250級）と区別できないため、線の特徴がある候補（クラスタ）にだけ当てる（needs_features）"
   }
  ]
 },
 {
  "id": "washing-machine",
  "category": "洗濯機",
  "kind": "設備",
  "patterns": [
   {
    "origin": "rule",
    "label": "防水パン（640級）",
    "size_range_mm": {
     "short": [
      615,
      665
     ],
     "long": [
      615,
      665
     ]
    },
    "aspect_range": [
     1,
     1.08
    ],
    "primitives": {
     "arc_share": [
      0,
      0.3
     ],
     "closed_outline": true,
     "inner_closed": null,
     "divider_min": null,
     "straight_back": null
    },
    "notes": "洗濯機防水パンの標準寸法 640×640（各社共通の規格寸法という事実）から。740×640・800×640 の大型パンもあるが、帯は640級に絞る（2026-11-24追加）"
   },
   {
    "origin": "rule",
    "label": "ドラム式",
    "size_range_mm": {
     "short": [
      620,
      660
     ],
     "long": [
      695,
      745
     ]
    },
    "aspect_range": [
     1.08,
     1.2
    ],
    "primitives": {
     "arc_share": [
      0.1,
      0.6
     ],
     "closed_outline": true,
     "inner_closed": true,
     "divider_min": null,
     "straight_back": null
    },
    "notes": "ドラム式洗濯機の本体寸法（幅640×奥行720級、前面の円いドア＝内側の閉曲線と円弧）から一般化（2026-11-24追加）"
   },
   {
    "origin": "rule",
    "label": "縦型・本体",
    "size_range_mm": {
     "short": [
      555,
      615
     ],
     "long": [
      555,
      660
     ]
    },
    "aspect_range": [
     1,
     1.15
    ],
    "primitives": {
     "arc_share": [
      0,
      0.4
     ],
     "closed_outline": true,
     "inner_closed": null,
     "divider_min": null,
     "straight_back": null
    },
    "notes": "縦型洗濯機の本体寸法（幅570〜600×奥行570〜630級）から一般化（2026-11-24追加）"
   }
  ]
 },
 {
  "id": "water-heater",
  "category": "電気温水器",
  "kind": "設備",
  "patterns": [
   {
    "origin": "rule",
    "label": "丸形",
    "size_range_mm": {
     "short": [
      640,
      740
     ],
     "long": [
      640,
      740
     ]
    },
    "aspect_range": [
     1,
     1.06
    ],
    "primitives": {
     "arc_share": [
      0.85,
      1
     ],
     "closed_outline": true,
     "inner_closed": false,
     "divider_min": null,
     "straight_back": null
    },
    "notes": "電気温水器の丸形：370L級 φ660・460L級 φ720（メーカー公表寸法という事実から一般化）。角形 630×730級は素の矩形で形が決まらないため入れない（2026-11-24追加）"
   }
  ]
 },
 {
  "id": "floor-drain",
  "category": "床排水口",
  "kind": "衛生器具",
  "patterns": [
   {
    "origin": "rule",
    "label": "丸形（単円）",
    "size_range_mm": {
     "short": [
      90,
      190
     ],
     "long": [
      90,
      190
     ]
    },
    "aspect_range": [
     1,
     1.12
    ],
    "primitives": {
     "arc_share": [
      0.85,
      1
     ],
     "closed_outline": true,
     "inner_closed": false,
     "divider_min": null,
     "straight_back": null
    },
    "notes": "床排水金具の目皿外径は配管径で決まる（JCW 203/204、中部コーポレーション公表値：40→φ100、50→φ130、65→φ155、75→φ180、100→φ215）。平面では φ100〜200級の円で描かれる。AIテスト図面の実測 φ120 とも一致（2026-11-24追加）"
   },
   {
    "origin": "rule",
    "label": "丸形（二重円）",
    "size_range_mm": {
     "short": [
      90,
      190
     ],
     "long": [
      90,
      190
     ]
    },
    "aspect_range": [
     1,
     1.12
    ],
    "primitives": {
     "arc_share": [
      0.85,
      1
     ],
     "closed_outline": true,
     "inner_closed": true,
     "divider_min": null,
     "straight_back": null
    },
    "notes": "同上。二重円（目皿＋枠）で描かれる場合（2026-11-24追加）"
   }
  ]
 },
 {
  "id": "vending-machine",
  "category": "自販機",
  "kind": "設備",
  "patterns": [
   {
    "origin": "rule",
    "label": "飲料自販機",
    "size_range_mm": {
     "short": [
      720,
      880
     ],
     "long": [
      1080,
      1280
     ]
    },
    "aspect_range": [
     1.3,
     1.65
    ],
    "primitives": {
     "arc_share": [
      0,
      0.15
     ],
     "closed_outline": true,
     "inner_closed": null,
     "divider_min": null,
     "straight_back": null
    },
    "notes": "飲料自販機の本体寸法（幅1000〜1250×奥行700〜950級）から。正解コーパスで 800×1200 の2件が「机」と誤認されていた実測に合わせ、奥行720〜880×長さ1080〜1280 の帯に絞る（2026-11-24追加）"
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
  /* 寸法だけの署名（scope:"dims"）は、線の特徴が分かる候補（家具クラスタ等）には当てない。
   * 線がある物は線の署名で判断する（長大な帯状クラスタを流し台と誤らないため）。 */
  if (p.scope === 'dims' && f.arcShare != null) return null;
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

/* ===== 寸法特性による確定の制限（2026-11-21、Web参照基準の実測から） =====
 * パターンの形のスコアが十分でも、外形寸法がその器具の実在寸法帯から外れていれば
 * 「形だけでは確定しない」として類似（要確認）に落とす。出典は
 * ~/workspace/kaku/work/symbol-webref/REFERENCE.md（国交省標準図・メーカー公表寸法という
 * 事実のみ）と、実図面シンボルの実測（TOILET_JWW.md：便器の平面幅はリモコン付きで496、
 * 描画寸法は公称より10〜15mm短いので帯は描画実測基準）。
 * 帯は short=短辺・long=長辺（mm）。どちらの辺が幅でどちらが奥行かは外形だけでは
 * 分からないので、両方向の割り当てが両方とも成り立たない時だけ外す（保守側）。
 * - 洋式大便器：描画の長さ上限は約800（実測最大785＋余裕）。幅はリモコン付き496が上限級。
 *   長さ>820 または 幅>510 は便器として確定しない。
 * - 小便器：幅330〜460・出寸法320〜420（LIXIL/TOTO公表寸法、Pass 2 で奥行上限420に拡張）。
 *   両辺がこの枠に収まらない物は確定しない。
 * - 浴槽：UB浴槽は幅800〜900・在来は700〜750、長さは公表の小型級からUB最大級の1,750まで。
 *   幅680〜950・長さ850〜1,750 の外は確定しない。なお長さの下限850には、かつて
 *   実例と誤認した図面由来の「小型浴槽帯」の話が混ざっていた（その実例は和式便器
 *   だった。BATH_RULE_REVIEW §4.3）。公表寸法では 750〜800 長の小型浴槽も実在する
 *   ため逆向きのリスクはあるが、正例がゼロの現状では数値は凍結し、本物の浴槽の
 *   実例で検証できたら再調整する。
 * - 洗面器（単体ボウルの奥行条件）：単体ボウルは奥行380以上が洗面器、360以下は手洗器の帯。
 *   ただし幅が手洗器の上限（500）を超えカウンター幅（600）に届かない中間の物は、
 *   手洗器でも洗面ボウルでもカウンターでもあり得ないので確定しない（奥行≤360・幅520〜580）。
 *   カウンター型（幅600級）は奥行が浅い物が実在する（実測600×250）ため、この条件の対象外。
 * - SK重なり帯：SK（560×456級）と洗面器単体（500〜600×450〜550）は寸法が完全に重なる。
 *   幅525〜600×奥行450〜460 では寸法を根拠に確定しない（洗面器・流し・SK の双方）。
 * 戻り値: 落とす理由のキー文字列、または null（制限なし） */
export function sizeVetoReason(category, f) {
  const s = f && f.short, l = f && f.long;
  if (!(s > 0) || !(l > 0)) return null;
  switch (category) {
    case '洋式大便器':
      if (l > 820 || s > 510) return 'toilet-size';
      return null;
    case '小便器':
      if (s < 320 || s > 420 || l < 330 || l > 460) return 'urinal-size';
      return null;
    case '浴槽':
      if (s < 680 || s > 950 || l < 850 || l > 1750) return 'bath-size';
      return null;
    case '洗面器':
      if (s <= 360 && l > 520 && l < 580) return 'basin-depth';
      if (s >= 450 && s <= 460 && l >= 525 && l <= 600) return 'sk-overlap';
      return null;
    case '流し・SK':
      if (s >= 450 && s <= 460 && l >= 525 && l <= 600) return 'sk-overlap';
      return null;
  }
  return null;
}

/* 判定の3区分（画面の色分け用）：検出＝緑、類似＝橙、不明＝灰色 */
export const SYM_VERDICTS = {
  hit: { key: "hit", name: "検出", color: "#3ccf8e" },
  near: { key: "near", name: "類似", color: "#ffb020" },
  unknown: { key: "unknown", name: "不明", color: "#9aa7b8" }
};

/* 図面から拾った器具の外形（b = [x0, y0, x1, y1]、単位は m）から辞書で判定する。
 * 器具のデータには外形しか無いので、判定に使う特徴は寸法だけ（円弧の割合・輪郭の閉じなどは null＝ゲートを通す）。
 * userDict（自分の辞書：利用者が「これは何か」を教えた { name, short, long, feat? } の配列）が最優先。
 *   寸法が実測パターンと同じ許容（±max(18mm, 5%)）で合えば、その名前で検出（mine: true）。
 *   feat（任意）：器具の形の特徴。署名（feat）付きの登録は、寸法に加えて形もほぼ同じ
 *   時にだけ当てる（matchUserSym。署名の無い登録は従来どおり寸法だけ）。
 * scale（任意）：図面の寸法の自動補正（js/symscale.js）。図面の座標が実寸の scale 倍で
 *   描かれている時、寸法の判定だけ実寸（寸法÷scale）で行う。戻り値の short/long は
 *   図面から測ったままの値（表示用）。scale が 1 の時は従来と完全に同じ。
 * 戻り値: { verdict: "hit" | "near" | "unknown", category, score, short, long, mine? }（short/long は mm） */
/* 自分の辞書の「形の署名」（辞書の学習・2026-11-23、~/workspace/kaku/work/learning/）：
 * 利用者が「これは何か」を教える時、寸法だけでなく、その時に測れた形の特徴
 * （円弧の割合・輪郭の閉じ・内側の閉曲線・仕切り線の数）も一緒に覚える。
 * 寸法だけの照合は実測で誤爆が多い（寸法のみの確定の正解率 15.9%）ため、
 * 署名のある登録は「寸法＋形がほぼ同じ」物にだけ当てる。
 * 意味論は従来どおり：自分の辞書は利用者本人が明示的に教えた判定なので
 * 上書きとして扱い、当たれば落とさない（mine）。変えたのは発火範囲だけで、
 * 署名の無い従来の登録は従来どおり寸法だけで照合する（互換性のため）。
 * 署名に記録した特徴は、判定側で測れていない特徴とは照合できない
 * （例：内側の閉曲線は器具の線からしか取れないので、家具クラスタには当たらない）。
 * 許容の根拠：同じ型の繰り返しは実測で特徴が完全一致した（三井屋の洗面器
 * クラスタ3件＝弧0.38・仕切り52本、日本モウルドの椅子4件＝弧0.82・仕切り0本）。
 * 弧 ±0.15・仕切り ±2 は、その一致に対して余裕を持たせた幅で、寸法帯の違う
 * 紛らわしい物（小便器 370×503 等）は寸法の時点で外れる。
 * 線の本数 n も署名に入れる：シミュレーションで、寸法・弧・仕切りがほぼ同じ
 * 洗面カウンター（600×2393・線67本）を教えたら、収納カウンター（600×2399・
 * 線8本の素の輪郭）に当たって裏返りが1件出たため。本数は「どれだけ細かく
 * 描かれた形か」で、素の輪郭と中身の描かれた器具はここが桁で違う。繰り返しの
 * 同型は本数が完全一致するので、比 0.5〜2 倍に収まる物だけ当てる。 */
export const USER_FEAT_ARC_TOL = 0.15;
export const USER_FEAT_DIV_TOL = 2;
export const USER_FEAT_N_RATIO = 2;

/* 測れた特徴から、自分の辞書に覚える署名だけを取り出す（測れていない物は入れない）。
 * feat は fixshape の特徴でも furndetect のクラスタでもよい。署名が空なら null */
export function slimSymFeat(feat) {
  if (!feat || typeof feat !== 'object') return null;
  const o = {};
  if (feat.arcShare != null && Number.isFinite(feat.arcShare)) o.arcShare = Math.round(feat.arcShare * 1000) / 1000;
  if (feat.closed != null) o.closed = !!feat.closed;
  if (feat.innerClosed != null) o.innerClosed = !!feat.innerClosed;
  if (feat.dividers != null && Number.isFinite(feat.dividers)) o.dividers = feat.dividers;
  if (feat.n != null && Number.isFinite(feat.n) && feat.n > 0) o.n = feat.n;
  return Object.keys(o).length ? o : null;
}

/* 自分の辞書の1件 u が、実寸 eShort/eLong（mm）と特徴 feat に当たるか。
 * 署名（u.feat）のある登録は、feat が無ければ照合できないので当てない */
export function matchUserSym(u, eShort, eLong, feat = null) {
  if (!u || !u.name || !(u.short > 0) || !(u.long > 0)) return false;
  const tolS = Math.max(18, u.short * 0.05), tolL = Math.max(18, u.long * 0.05);
  if (Math.abs(eShort - u.short) > tolS || Math.abs(eLong - u.long) > tolL) return false;
  if (!u.feat) return true;
  if (!feat) return false;
  const f = u.feat;
  if (f.arcShare != null && (feat.arcShare == null || Math.abs(feat.arcShare - f.arcShare) > USER_FEAT_ARC_TOL)) return false;
  if (f.closed != null && (feat.closed == null || !!feat.closed !== !!f.closed)) return false;
  if (f.innerClosed != null && (feat.innerClosed == null || !!feat.innerClosed !== !!f.innerClosed)) return false;
  if (f.dividers != null && (feat.dividers == null || Math.abs(feat.dividers - f.dividers) > USER_FEAT_DIV_TOL)) return false;
  if (f.n != null && (!(feat.n > 0) || feat.n > f.n * USER_FEAT_N_RATIO || f.n > feat.n * USER_FEAT_N_RATIO)) return false;
  return true;
}

export function classifyBox(b, userDict = [], scale = 1, feat = null) {
  if (!b || b.length < 4) return { verdict: "unknown", category: null, score: 0, short: 0, long: 0 };
  const w = Math.abs(b[2] - b[0]) * 1000, h = Math.abs(b[3] - b[1]) * 1000;
  const short = Math.min(w, h), long = Math.max(w, h);
  const sc = (typeof scale === 'number' && Number.isFinite(scale) && scale > 0) ? scale : 1;
  const eShort = short / sc, eLong = long / sc;
  for (const u of userDict || []) {
    if (matchUserSym(u, eShort, eLong, feat))
      return { verdict: "hit", category: u.name, score: 1, short, long, mine: true };
  }
  const r = classifySymbol({ short, long, arcShare: null, closed: null, innerClosed: null, dividers: null }, sc);
  if (r.result === "不明") return { verdict: "unknown", category: null, score: r.score, short, long, second: r.second, secondScore: r.secondScore, chairScore: r.chairScore };
  if (r.result === "要確認") return { verdict: "near", category: r.category, score: r.score, short, long, second: r.second, secondScore: r.secondScore, chairScore: r.chairScore, sizeVeto: r.sizeVeto };
  return { verdict: "hit", category: r.result, score: r.score, short, long, second: r.second, secondScore: r.secondScore, chairScore: r.chairScore };
}

/* 器具の「表示用」判定（sw.46）：classifyBox の生判定を、画面に出す段位だけ落とした物。
 * 器具への確定（classifyBox）は寸法だけが根拠で、形の特徴が無い。実測では
 * 寸法のみの確定の正解率は 15.9%（13/82）しかなく、形で判定する家具クラスタの
 * 確定（80.7%、230/285）と大きく違う（FIVE_DRAWING_REREVIEW §5）。そのため
 * 表示では器具の hit を「類似（要確認）」までに落とし、確定とは出さない。
 * ただし生の判定は rawVerdict に残し、タイプ補正（js/typefix.js）はそちらを使う
 * （補正側は寸法以外の裏付けと組み合わせて判断するため）。
 * 自分の辞書（mine）の hit は利用者本人が教えた判定なので落とさない。
 *
 * sw.49：feat（任意）＝ js/fixshape.js が器具の輪郭の線から取り出した形の特徴。
 * 形の判定が決着（スコア0.90以上・2位との差0.05以上＝classifySymbol の確定条件）
 * し、カテゴリが「オフィス什器」の時だけ、表示を形の「検出」にする（shapeBased）。
 * 範囲をオフィス什器に限るのは 2026-11-22 の5図面実測による：形の確定は
 * 机・デスクで 7/7 正解だった一方、衛生器具・設備では 0/5（便器と流し・SKの
 * ダブルボウルは平面の形と寸法がほぼ同じで、肘掛け椅子はキッチンのパターンに
 * 化ける。衛生器具の形の1位は僅差の物が大半で、確定の物差しでは決着しない）。
 * 形が決着しない・対象外のカテゴリの時は、従来の表示と完全に同じにする。
 * sw.50：タンク帯の証拠で決着した便器（classifyFixtureShape が tankBand を
 * 付けて返した hit）も、形の「検出」にする。帯の証拠が無い衛生器具は
 * 従来どおり確定しない（classifyFixtureShape の注記に実測の境界）。
 * タイプ補正へ渡す材料は従来のまま壊さないよう、寸法だけの生判定を
 * rawVerdict（段位）・boxCat・boxScore・boxVeto（カテゴリ・スコア・寸法制限）に
 * 常に残す（typefix 側はそちらを読む） */
const SYM_KIND_OF = new Map(SYM_DICT.map(e => [e.category, e.kind]));
const SHAPE_DISPLAY_KINDS = new Set(['オフィス什器']);

/* 器具の形の特徴を辞書で判定する。家具クラスタの classifyCluster と違い、
 * innerClosed（ボウルの閉曲線の有無）もゲートに渡す（辞書のパターンが
 * 小便器と便器・洗面器の切り分けに使うため）。自分の辞書は寸法の照合
 * （classifyBox）側で先に見るので、ここでは組み込みの辞書だけを使う。
 * 戻り値は classifyBox と同じ形。特徴が無ければ null
 *
 * sw.50 タンク帯の証拠（feat.tankBand、js/fixshape.js が器具本体の線だけで測定）：
 * 便器の形は流し・SK のダブルボウル実測パターンとほぼ一致し、形だけでは
 * 「SK 0.978 対 便器 0.931」の僅差で決着しない（高等学園の便器18件）。
 * そこで「タンク帯がある」ことを便器確定の必要条件とし、帯がある時だけ
 * 流し・SK を候補から外して便器で決着するかを見る（外した後の順位でも
 * スコア0.90以上・2位との差0.05以上・寸法制限なし、を全て満たす時だけ確定。
 * 判定は classifySymbol がそのまま行う）。ボウル（innerClosed）も必須。
 * 実測の境界（2026-11-22、5図面・~/workspace/kaku/work/tankband/）：
 * - 発火は高等学園の便器18件のみ、全件正解。便器は18/18が帯ありだった。
 * - 小便器はこの経路では確定しない。帯の有無は小便器を分離しない（実測で
 *   小便器19件中18件が「帯あり」：シンボルの中心線や背面の線が帯状に読める
 *   ため）ので、「帯なし→小便器」の判定は入れていない。
 * - 洗面器は候補から外さない。洗面器との僅差（0.034〜0.049）が残る物
 *   （高等学園の小便器、三井屋の洗面器・手洗い）は従来どおり類似のまま。
 * - 帯が無い・測れない（tankBand が true でない）時はこの経路は使わず、
 *   形の判定は従来どおり（衛生器具は表示で確定しない）。 */
/* 衛生器具の形の証拠分岐（2026-11-23、~/workspace/kaku/work/sanfix/）：
 * タンク帯（sw.50）と同じ作りで、器具本体の線だけから測った証拠がそろった時だけ、
 * 辞書の再順位付けで小便器／洗面器を「検出」にする。物差しでの検証：
 *   小便器：ジェイテクト15件（370×503）・三井屋3件（380×509/380×410）が全件この形で、
 *     内側の鉢の閉形の弧率は 0.68〜1.0。コートハンガー（三井屋でなく大天F14、380×380・
 *     利用者確認済み「物ではない」）は内側閉形の弧率 0.37 でここで外れる。
 *   洗面器：三井屋F14（407×500・鉢の閉形あり・輪郭は角ばって弧率0.45）。
 *     SK（手洗い器）は仕切り線の多さ（99本）で外れる。
 * どちらも「辞書が単独でその種類を返した時だけ」確定し、接戦は確定にしない。
 * 小便器だけは寸法の安全弁（長辺>460）で要確認に落ちる形を、証拠がそろい
 * スコア差0.05以上ある場合に限って確定として扱う（安全弁の趣旨は寸法だけの
 * 誤認防止で、ここでは形の証拠が別にあるため）。 */
function sanitaryShapeEvidence(feat, f, scale) {
  if (feat.innerClosed !== true) return null;
  if (feat.dividers == null || feat.dividers > 2) return null;
  if (feat.arcShare == null) return null;
  const shapes = Array.isArray(feat.innerShapes) ? feat.innerShapes : [];
  if (!shapes.length || !(shapes[0].arcShare >= 0.55)) return null;
  const sc = scale && scale > 0 ? scale : 1;
  const sh = sc === 1 ? feat.short : feat.short / sc;
  const lo = sc === 1 ? feat.long : feat.long / sc;
  const arc = feat.arcShare;
  if (sh >= 330 && sh <= 430 && lo >= 380 && lo <= 560 && arc >= 0.50) {
    const ev = classifySymbol(f, scale, { exclude: ['洋式大便器'] });
    if (ev.result === '小便器')
      return { verdict: 'hit', category: '小便器', score: ev.score, second: ev.second, secondScore: ev.secondScore, chairScore: ev.chairScore, urinalShape: true };
    if (ev.result === '要確認' && ev.category === '小便器' && ev.sizeVeto === 'urinal-size' &&
        ev.score >= SYM_THRESHOLD && (ev.secondScore == null || ev.score - ev.secondScore >= 0.05))
      return { verdict: 'hit', category: '小便器', score: ev.score, second: ev.second, secondScore: ev.secondScore, chairScore: ev.chairScore, urinalShape: true };
    return null;
  }
  if (sh >= 370 && sh <= 570 && lo >= 440 && lo <= 760 && arc <= 0.50) {
    const ev = classifySymbol(f, scale, { exclude: ['洋式大便器'] });
    if (ev.result === '洗面器')
      return { verdict: 'hit', category: '洗面器', score: ev.score, second: ev.second, secondScore: ev.secondScore, chairScore: ev.chairScore, basinShape: true };
    return null;
  }
  return null;
}

export function classifyFixtureShape(feat, scale = 1) {
  if (!feat || !(feat.short > 0) || !(feat.long > 0)) return null;
  const f = {
    short: feat.short, long: feat.long,
    arcShare: feat.arcShare != null ? feat.arcShare : null,
    closed: feat.closed != null ? feat.closed : null,
    innerClosed: feat.innerClosed != null ? feat.innerClosed : null,
    dividers: feat.dividers != null ? feat.dividers : null,
  };
  if (feat.tankBand === true && feat.innerClosed === true) {
    const ev = classifySymbol(f, scale, { exclude: ['流し・SK'] });
    if (ev.result === '洋式大便器')
      return { verdict: 'hit', category: '洋式大便器', score: ev.score, second: ev.second, secondScore: ev.secondScore, chairScore: ev.chairScore, tankBand: true };
  }
  const sev = sanitaryShapeEvidence(feat, f, scale);
  if (sev) return sev;
  const r = classifySymbol(f, scale);
  if (r.result === '不明') return { verdict: 'unknown', category: null, score: r.score, second: r.second, secondScore: r.secondScore, chairScore: r.chairScore };
  if (r.result === '要確認') return { verdict: 'near', category: r.category, score: r.score, second: r.second, secondScore: r.secondScore, chairScore: r.chairScore, sizeVeto: r.sizeVeto };
  return { verdict: 'hit', category: r.result, score: r.score, second: r.second, secondScore: r.secondScore, chairScore: r.chairScore };
}

export function classifyFixtureDisplay(b, userDict = [], scale = 1, feat = null) {
  const r = classifyBox(b, userDict, scale, feat);
  const base = { ...r, rawVerdict: r.verdict, boxCat: r.category, boxScore: r.score, boxVeto: r.sizeVeto || null };
  if (r.mine) return base;
  if (feat) {
    const s = classifyFixtureShape(feat, scale);
    /* 形の「検出」にするのは、オフィス什器で決着した物と、タンク帯の証拠で
     * 決着した便器（s.tankBand が付いた物）と、衛生器具の形の証拠分岐で
     * 決着した小便器・洗面器（s.urinalShape / s.basinShape が付いた物）だけ */
    if (s && s.verdict === 'hit' && (SHAPE_DISPLAY_KINDS.has(SYM_KIND_OF.get(s.category)) || s.tankBand != null || s.urinalShape != null || s.basinShape != null)) {
      return { ...base, verdict: 'hit', category: s.category, score: s.score, second: s.second, secondScore: s.secondScore, chairScore: s.chairScore, sizeVeto: null, shapeBased: true, ...(s.tankBand != null ? { tankBand: s.tankBand } : {}), ...(s.urinalShape != null ? { urinalShape: s.urinalShape } : {}), ...(s.basinShape != null ? { basinShape: s.basinShape } : {}) };
    }
  }
  if (r.verdict !== 'hit') return base;
  return { ...base, verdict: 'near', capped: true };
}

/* 「素の四角」ガード（試行・2026-11-22、~/workspace/kaku/work/tagtrial/）：
 * 物ではない物（仕上表のセル・柱など）のクラスタが、素の四角形の輪郭だけで家具として
 * 「検出（確定）」になるのを、表示の段位だけ「類似」に落とすための材料。
 * bareClusterFlags が、図面のクラスタ全体と文字から、クラスタごとの該当を返す。
 * 署名（正しさの物差し sw.51 時点の実測：母集団B「物ではないのに確定」39件で測定）：
 *   - 線の本数が 6 本以下（四角とわずかな内線だけ）
 *   - 円弧の割合が 0.02 以下（ほぼ直線だけ）
 *   - 辺を共有して接する隣のクラスタが無い（机の列・島は辺を接して並ぶので外れる）
 *   - 外形の中に文字が無い（名前の書かれた実在の什器を外すため）
 * 4条件の組み合わせで 39 件中 30 件を覆い、正解だった家具 210 件には 1 件も当たらなかった。
 * 覆えない残り 9 件（線の多い階段・寸法線・部屋の範囲線・文字のある帯）は別の失敗の型で、
 * このガードの対象にしない。 */
export const BARE_MAX_SEGS = 6;
export const BARE_MAX_ARC = 0.02;
const BARE_EDGE_GAP_M = 0.02;   /* 辺が接していると見る隙間の上限（m） */
const BARE_EDGE_OVL = 0.8;      /* 辺の重なりが短い方の辺のこの割合以上で「共有」 */
export function bareClusterFlags(clusters, texts = []) {
  const list = clusters || [];
  const sharesEdge = (b, q) => {
    const ovY = Math.min(b[3], q[3]) - Math.max(b[1], q[1]);
    const ovX = Math.min(b[2], q[2]) - Math.max(b[0], q[0]);
    const h = Math.min(b[3] - b[1], q[3] - q[1]), w = Math.min(b[2] - b[0], q[2] - q[0]);
    if (ovY >= BARE_EDGE_OVL * h && (Math.abs(q[0] - b[2]) <= BARE_EDGE_GAP_M || Math.abs(q[2] - b[0]) <= BARE_EDGE_GAP_M)) return true;
    if (ovX >= BARE_EDGE_OVL * w && (Math.abs(q[1] - b[3]) <= BARE_EDGE_GAP_M || Math.abs(q[3] - b[1]) <= BARE_EDGE_GAP_M)) return true;
    return false;
  };
  return list.map((f, j) => {
    if (!f || !f.b || !(f.n >= 0) || f.n > BARE_MAX_SEGS) return false;
    if (f.arcShare == null || f.arcShare > BARE_MAX_ARC) return false;
    const b = f.b;
    for (let k = 0; k < list.length; k++) {
      if (k === j) continue;
      const q = list[k] && list[k].b;
      if (q && sharesEdge(b, q)) return false;
    }
    for (const t of texts || []) {
      if (t && t.x >= b[0] && t.x <= b[2] && t.y >= b[1] && t.y <= b[3]) return false;
    }
    return true;
  });
}

/* 素の四角ガードの適用：該当クラスタの「検出」を表示だけ「類似」に落とす。
 * 生の判定は rawVerdict に残す（sw.46 の器具表示キャップと同じ考え方）。
 * 自分の辞書（mine＝利用者本人が教えた判定）は落とさない。 */
const capBareHit = (r, guard) => (guard && r && r.verdict === 'hit' && !r.mine)
  ? { ...r, verdict: 'near', capped: true, rawVerdict: 'hit' } : r;

/* ===== 抽出強化ステップ1：物ではない物の除外（2026-11-22、~/workspace/kaku/work/extstep1/） =====
 * チェックパック5の全数センサスで、村中さん判定済み293件中121件が「拾い方」の欠陥で、
 * 最大の塊が「物ではない物（仕上表のセル・柱・寸法線・ロゴ等）を拾ったクラスタ」86件だった。
 * その実測（EXTRACTION_STEP1_TRIAL.md）に基づく除外の署名。上の素の四角ガード
 * （弱体化＝類似に落とすだけ）とは役割が違う：こちらは一覧から消す「除外」なので、
 * 署名は弱体化版より締めてある。同じ素の四角でも、弱体化の旧条件のままでは実物を
 * 7件消すことが実測で分かっており（受付カウンター・人物ピクト付き机×3・303mm角の
 * 金物/点検口×3）、「仕切り線=0」「長辺≤2000mm」の2条件を足した形だけを除外に使う。
 * 実測のゲート（293件・安全集合411件）：非対象 45/86 解消、誤除外は
 * クリーン 0/167・実物+欠陥 0/35・未判定 0/209、ジェイテクトは無傷。
 *
 * 組み合わせ方（project.js の symList）：
 *   - 層B（nonObjectFlags）は家具クラスタだけに適用し、該当は一覧に出さない。
 *   - 層A（titleRegionFlags）は器具だけに適用し、表題欄・表の領域にある器具
 *     （実測ではロゴ6件のみ）を一覧に出さない。器具の形での除外はしない。
 *   - 弱体化ガード（bareClusterFlags）は従来どおり残る物の判定に効く。除外された
 *     物は判定結果ごと捨てるので、二重に処理されることはない（除外が先・弱体化は残り）。
 *   - 椅子の文脈判定の入力は従来どおり全クラスタのまま（除外は一覧への追加時点だけ）。
 *     残るクラスタの判定が一切動かないことを優先した。
 * 棄却した署名は trial 側に理由つきで記録してある（扉の開き軌跡・帯状・壁線束・
 * 円形・文字そのもの）。ここには足さないこと。 */
const NONOBJ_NUMTEXT = /^[\d０-９][\d０-９,，.．\s]*$/;
const NONOBJ_MAT_RE = /クロス|長尺|タイル|シート|ボード|ケイカル|モルタル|仕上|カーペット|フローリング|フロア|塗装|下地|床|壁|天井/;
const NONOBJ_NEAR_M = 0.3; /* 数字文字を「近傍」と見る箱の広げ幅（m） */

/* 1クラスタ分の除外署名の判定。f は furndetect の候補（{ b, n, arcShare, dividers }）、
 * ctx は nonObjectFlags が用意する周囲の材料（寸法mm・箱内の文字・隣接数）。
 * 戻り値は当たった署名の名前（'bare2' | 'column' | 'dimline' | 'finish' | 'textcol'）、
 * 無ければ null。条件は trial の final.mjs と一致させること */
export function nonObjectSignature(f, ctx) {
  if (!f || !ctx) return null;
  const n = f.n, arc = f.arcShare, div = f.dividers;
  /* B1'' 素の四角（強化版）：線≤6・円弧≤0.02・仕切り線=0・文字なし・辺を接する隣なし・長辺≤2000mm */
  if (n != null && n <= 6 && arc != null && arc <= 0.02 && div === 0
    && ctx.textsIn === 0 && ctx.edgeNeighbours === 0 && ctx.long <= 2000) return 'bare2';
  /* B3'' 柱状の単独四角：短辺320–1100mm相当（短辺≥320・長辺≤1100）・アスペクト≤1.45・線≤10・円弧≤0.08・仕切り線≤2・文字なし */
  if (ctx.aspect != null && ctx.aspect <= 1.45 && ctx.short >= 320 && ctx.long <= 1100
    && n != null && n <= 10 && arc != null && arc <= 0.08 && div != null && div <= 2 && ctx.textsIn === 0) return 'column';
  /* B2'' 寸法線：アスペクト≥5・短辺≤1000mm・線≤12・円弧≤0.05・仕切り線≤30・数字文字が箱内か近傍に≥1 */
  if (ctx.aspect != null && ctx.aspect >= 5 && ctx.short <= 1000
    && n != null && n <= 12 && arc != null && arc <= 0.05 && div != null && div <= 30
    && (ctx.numTextNear >= 1 || ctx.numTextIn >= 1)) return 'dimline';
  /* B8 仕上げ文字の内包：箱内に仕上げ系の語を含む文字が≥2件 */
  if (ctx.matIn >= 2) return 'finish';
  /* B11 文字の柱：箱内文字≥4件・線≤8・円弧≤0.02・アスペクト≥2 */
  if (ctx.textsIn >= 4 && n != null && n <= 8 && arc != null && arc <= 0.02
    && ctx.aspect != null && ctx.aspect >= 2) return 'textcol';
  return null;
}

/* 家具クラスタの除外フラグ（層B）。clusters は furndetect の候補列、texts は図面の文字
 * （{ t, x, y }）、poolBoxes は辺を接する隣を数える母集団の箱（器具＋家具の全箱。
 * 省略時は clusters 自身の箱）。trial では隣接を器具込みの全クラスタで数えたので、
 * 呼び出し側（project.js）も器具の箱を合わせて渡すこと */
export function nonObjectFlags(clusters, texts = [], poolBoxes = []) {
  const list = clusters || [];
  const pool = (poolBoxes && poolBoxes.length) ? poolBoxes : list.map(f => f && f.b);
  const sharesEdge = (b, q) => {
    const ovY = Math.min(b[3], q[3]) - Math.max(b[1], q[1]);
    const ovX = Math.min(b[2], q[2]) - Math.max(b[0], q[0]);
    const h = Math.min(b[3] - b[1], q[3] - q[1]), w = Math.min(b[2] - b[0], q[2] - q[0]);
    if (ovY >= BARE_EDGE_OVL * h && (Math.abs(q[0] - b[2]) <= BARE_EDGE_GAP_M || Math.abs(q[2] - b[0]) <= BARE_EDGE_GAP_M)) return true;
    if (ovX >= BARE_EDGE_OVL * w && (Math.abs(q[1] - b[3]) <= BARE_EDGE_GAP_M || Math.abs(q[3] - b[1]) <= BARE_EDGE_GAP_M)) return true;
    return false;
  };
  const inBox = (t, B) => t && t.x >= B[0] && t.x <= B[2] && t.y >= B[1] && t.y <= B[3];
  return list.map(f => {
    if (!f || !f.b || f.b.length < 4) return false;
    const b = f.b;
    const w = Math.abs(b[2] - b[0]) * 1000, h = Math.abs(b[3] - b[1]) * 1000;
    const short = Math.round(Math.min(w, h)), long = Math.round(Math.max(w, h));
    const inList = (texts || []).filter(t => inBox(t, b)).map(t => String((t && t.t) != null ? t.t : ''));
    const nearBox = [b[0] - NONOBJ_NEAR_M, b[1] - NONOBJ_NEAR_M, b[2] + NONOBJ_NEAR_M, b[3] + NONOBJ_NEAR_M];
    const nearList = (texts || []).filter(t => inBox(t, nearBox)).map(t => String((t && t.t) != null ? t.t : ''));
    let edgeNeighbours = 0;
    for (const q of pool) { if (q && q !== b && q.length >= 4 && sharesEdge(b, q)) edgeNeighbours++; }
    const ctx = {
      short, long, aspect: short > 0 ? long / short : null,
      textsIn: inList.length,
      numTextIn: inList.filter(s => NONOBJ_NUMTEXT.test(s.trim())).length,
      numTextNear: nearList.filter(s => NONOBJ_NUMTEXT.test(s.trim())).length,
      matIn: inList.filter(s => NONOBJ_MAT_RE.test(s)).length,
      edgeNeighbours,
    };
    return nonObjectSignature(f, ctx) !== null;
  });
}

/* 器具の表題欄・表の領域フラグ（層A）。boxes は器具の外形、regions は reader2 の
 * frame 解析の regions（{ type, box }）、faces/marks は区画とそのマーク（marks は
 * 区画の i がキー、{ s, type }）。中心が表・表題欄の領域内／箱の80%以上が領域内／
 * 中心を含む最小の区画のマークが out（table|title）のいずれかで該当。
 * 実測では該当はロゴ6件（江南4・日本モウルド1・三井屋1）のみで、実器具には当たらない。
 * regions が無い図面（frame 解析が無い保存案件）では全て false（従来どおり） */
export function titleRegionFlags(boxes, regions = [], faces = [], marks = {}) {
  const regs = (regions || []).filter(r => r && r.box && r.box.length >= 4 && (r.type === 'table' || r.type === 'title'));
  const pip = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], q = P[j]; if ((a[1] > y) !== (q[1] > y) && x < (q[0] - a[0]) * (y - a[1]) / (q[1] - a[1]) + a[0]) c = !c; } return c; };
  return (boxes || []).map(b => {
    if (!b || b.length < 4) return false;
    const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
    for (const r of regs) if (cx >= r.box[0] && cx <= r.box[2] && cy >= r.box[1] && cy <= r.box[3]) return true;
    const area = Math.abs((b[2] - b[0]) * (b[3] - b[1]));
    if (area > 0) {
      for (const r of regs) {
        const ix = Math.max(0, Math.min(b[2], r.box[2]) - Math.max(b[0], r.box[0]));
        const iy = Math.max(0, Math.min(b[3], r.box[3]) - Math.max(b[1], r.box[1]));
        if ((ix * iy) / area >= 0.8) return true;
      }
    }
    let best = Infinity, fm = null;
    (faces || []).forEach(f => {
      if (!f || !f.poly || f.poly.length < 3 || !pip(cx, cy, f.poly)) return;
      let a = 0; for (let k = 0, j = f.poly.length - 1; k < f.poly.length; j = k++) a += (f.poly[j][0] + f.poly[k][0]) * (f.poly[j][1] - f.poly[k][1]);
      a = Math.abs(a / 2);
      if (a < best) { best = a; const m = marks[f.i] || marks[String(f.i)]; fm = m ? { s: m.s, type: m.type } : null; }
    });
    return !!(fm && fm.s === 'out' && (fm.type === 'table' || fm.type === 'title'));
  });
}

/* 線の集まりから切り出した形（js/furndetect.js の候補）を判定する。
 * f: { short, long（mm）, arcShare, closed, dividers }。自分の辞書が最優先
 * （寸法で照合し、署名付きの登録は形も照合する＝matchUserSym）。
 * ctx（任意）: buildChairContexts が作る文脈。ある時だけ、「類似」を文脈で確定に上げる
 * （椅子ルートと衛生ルート。下の文脈判定の節を参照）。
 * ctx が無い時の戻り値は従来と完全に同じ。
 * scale（任意）：classifyBox と同じ寸法の自動補正。判定だけ実寸で行い、戻り値の寸法は測ったまま。
 * guard（任意）：bareClusterFlags の該当。当たった時だけ、組み込み辞書の「検出」を
 * 表示用に「類似」へ落とす（capBareHit）。既定 false では従来と完全に同じ。
 * 戻り値は classifyBox と同じ形 */
export function classifyCluster(f, userDict = [], ctx = null, scale = 1, guard = false) {
  const short = f && f.short, long = f && f.long;
  if (!(short > 0) || !(long > 0)) return { verdict: "unknown", category: null, score: 0, short: 0, long: 0 };
  const sc = (typeof scale === 'number' && Number.isFinite(scale) && scale > 0) ? scale : 1;
  const eShort = short / sc, eLong = long / sc;
  for (const u of userDict || []) {
    if (matchUserSym(u, eShort, eLong, f))
      return { verdict: "hit", category: u.name, score: 1, short, long, mine: true };
  }
  const r = classifySymbol({ short, long, arcShare: f.arcShare != null ? f.arcShare : null, closed: f.closed != null ? f.closed : null, innerClosed: null, dividers: f.dividers != null ? f.dividers : null }, sc);
  if (r.result === "不明") return { verdict: "unknown", category: null, score: r.score, short, long, second: r.second, secondScore: r.secondScore, chairScore: r.chairScore };
  if (r.result === "要確認") return capBareHit(promoteChair({ verdict: "near", category: r.category, score: r.score, short, long, second: r.second, secondScore: r.secondScore, chairScore: r.chairScore, sizeVeto: r.sizeVeto }, ctx), guard);
  return capBareHit({ verdict: "hit", category: r.result, score: r.score, short, long, second: r.second, secondScore: r.secondScore, chairScore: r.chairScore }, guard);
}

/* ===== 文脈判定（2026-11-19、椅子→一般化） =====
 * 椅子は平面の形が洗面器・小便器とほぼ同じで、形だけでは「類似（僅差）」止まりになる
 * （実図面5件で類似止まり175件・確定は僅か）。2026-11-18 の合意どおり、文脈は
 * 「形の判定が僅差の時だけ、その決着に使う」。はっきりした形の判定は文脈で覆さない。
 * 実図面での測定（~/workspace/kaku/work/yardstick/chair_ctx_analysis*.mjs、
 * diag_sym36*.mjs、proto_sym36_v2.mjs）で決めた条件：
 *   - 形のスコアが 0.95 以上（実椅子候補は全て 0.979 以上。形そのものが弱い物は救わない）
 *   - 支持：確定した机・デスクの縁まで 0.6m 以内／同じ寸法の候補が 2m 以内に2件以上
 *     （机に付く・列をなす、が実椅子の姿）／属するゾーンの名前が事務・会議などの部屋名
 *   - 水回りの文脈が先に効く（椅子には上げない）：ゾーン名が水回り／小さい区画（15㎡以下）
 *     の中に水回りの文字（便・洗・湯・浴・トイレ等）がある／2m 以内に水回りの文字がある／
 *     便器・小便器の器具の縁まで 0.5m 以内
 * 昇格した判定には context を付ける（画面で「文脈で確定」と分かるように）。
 *
 * 一般化（sw.36）：実測で、食堂・待合の椅子は形の1位が洗面器（椅子は2位 0.954）になる
 * ことが分かった（江南の食堂・待合で34件、目視確認済み）。そこで椅子ルートは
 * 「1位が椅子」だけでなく「1位が衛生器具でも、椅子の形スコアが 0.95 以上あり、
 * 支持があり、水回りでなければ椅子で確定」まで広げた。反復（列）の数え方も、
 * 1位カテゴリを問わず「椅子の形スコア 0.95 以上の類似候補＋確定した椅子」に一般化した。
 * 逆向きに、トイレ内の小便器の列（形は小便器1位・洋式大便器と僅差）は、衛生側の
 * 確認シグナルで確定する：便器・小便器の器具の縁まで 1m 以内、または水回りの文字が
 * 1m 以内にある物を「アンカー」とし、同寸法で連なる列全体に効かせる（三井屋の小便器3件）。
 * 確認シグナルは降格シグナルより厳しく取る（ゾーン名は確認には使わない。実測で、
 * 待合の椅子が入った区画に「女子トイレ」のゾーン名が付く例があり、ゾーン名だけで
 * 洗面器に確定すると誤認になるため）。
 * またゾーン名の水回り降格は、区画が 20㎡ を超える場合は効かせない（複数の部屋が
 * 混ざった大きな区画では、ゾーン名がその場所の部屋名とは限らないため。同上の実測）。 */
export const CHAIR_CTX_FLOOR = 0.95;
const CHAIR_DESK_MAX = 0.6;      /* 机の縁までの距離（m） */
const CHAIR_REP_MIN = 2;         /* 同じ寸法の候補がこの件数以上、近くにあれば「列」 */
const CHAIR_REP_R = 2.0;         /* 反復を数える半径（m） */
const CHAIR_REP_TOL = 45;        /* 「同じ寸法」と見る許容（mm） */
const CHAIR_WET_TEXT_MAX = 2.0;  /* 水回りの文字がこの距離（m）以内にあれば水回り文脈（降格用） */
const CHAIR_SAN_MAX = 0.5;       /* 便器・小便器の縁までの距離（m、降格用） */
const CHAIR_FACE_WET_MAX = 15;   /* 区画内の文字で水回りと見る区画の大きさ上限（㎡） */
const ZONE_WET_FACE_MAX = 20;    /* ゾーン名で水回りと見る区画の大きさ上限（㎡） */
const SAN_FIX_ANCHOR_MAX = 1.0;  /* 衛生の確認：便器・小便器の縁までの距離（m） */
const SAN_TEXT_ANCHOR_MAX = 1.0; /* 衛生の確認：水回りの文字までの距離（m） */
const SAN_CATS = new Set(['小便器', '洋式大便器', '和式便器', '洗面器', '流し・SK', '浴槽']);
const WET_NAME_RE = /便|洗|湯|浴|トイレ|厠|WC/i;
const OFFICE_NAME_RE = /事務|会議|応接|社長|役員|食堂|待合|休憩|ロビー|受付|打合|ミーティング|控室|談話|教室|研修|執務|講義|実習室|図書/;
const SAN_TYPES = new Set(['toilet', 'urinal']);

const pipC = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
const polyAreaC = P => { let a = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) a += (P[j][0] + P[i][0]) * (P[j][1] - P[i][1]); return Math.abs(a / 2); };
const edgeDistC = (a, b) => { const dx = Math.max(0, Math.max(a[0] - b[2], b[0] - a[2])); const dy = Math.max(0, Math.max(a[1] - b[3], b[1] - a[3])); return Math.hypot(dx, dy); };
const chairScoreOf = r => (r && r.chairScore != null ? r.chairScore : (r && r.category === '椅子' ? r.score : 0));

/* 素の判定 r に文脈 ctx を適用する。昇格する時だけ新しいオブジェクトを返し、それ以外は r をそのまま返す。
 * 椅子ルート（context: "chair"）：1位が椅子、または1位が衛生器具でも椅子の形が有力な時、
 *   水回りでなく支持があれば椅子で確定する。
 * 衛生ルート（context: "sanitary"）：1位が衛生器具のまま、アンカー（器具・文字への近さ）
 *   またはアンカーと同寸法で連なる列に属する時、その1位カテゴリで確定する。 */
export function promoteChair(r, ctx) {
  /* sizeVeto（寸法が実在帯の外）の類似は、文脈でも確定に上げない。寸法の不成立は文脈では覆らない */
  if (!ctx || !r || r.mine || r.verdict !== 'near' || r.sizeVeto) return r;
  const support = !!(ctx.desk || ctx.rep || ctx.office);
  if (r.category === '椅子') {
    if (!(r.score >= CHAIR_CTX_FLOOR)) return r;
    if (ctx.wet) return r;
    if (support) return { ...r, verdict: 'hit', context: 'chair' };
    return r;
  }
  if (SAN_CATS.has(r.category) && r.score >= CHAIR_CTX_FLOOR) {
    if (chairScoreOf(r) >= CHAIR_CTX_FLOOR && !ctx.wet && support)
      return { ...r, verdict: 'hit', category: '椅子', context: 'chair' };
    if (ctx.anchor || ctx.anchorGroup) return { ...r, verdict: 'hit', context: 'sanitary' };
  }
  return r;
}

/* 候補全体（clusters と、その素の判定 base）と周囲の情報 env から、候補ごとの文脈を作る。
 * env: { zones: [{name, faces:[区画の i]}], faces: [{i, poly}], fixtures: [{b, t}], texts: [{t| s, x, y}] }
 * 戻り値: clusters と同じ並びの配列（文脈で決着しうる「類似」候補以外は null） */
/* scale（任意、既定 1）：寸法の自動補正。「同じ寸法」の許容（実寸で 45mm）は、
 * 図面の測ったままの寸法で比べる時は scale 倍にして使う（距離の根拠は実寸のまま） */
export function buildChairContexts(clusters, base, env = {}, scale = 1) {
  const repTol = CHAIR_REP_TOL * ((typeof scale === 'number' && Number.isFinite(scale) && scale > 0) ? scale : 1);
  const out = new Array((clusters || []).length).fill(null);
  if (!clusters || !clusters.length) return out;
  const zones = env.zones || [], faces = env.faces || [], fixtures = env.fixtures || [], texts = env.texts || [];
  const candIdx = [], deskIdx = [], repPool = [], sanIdx = [];
  clusters.forEach((x, j) => {
    if (!x || !x.b || !base || !base[j]) return;
    const b = base[j];
    if (b.verdict === 'hit' && b.category === '机・デスク') deskIdx.push(j);
    if (b.verdict === 'hit' && b.category === '椅子') repPool.push(j);
    if (b.verdict !== 'near') return;
    if (chairScoreOf(b) >= CHAIR_CTX_FLOOR) repPool.push(j);
    if (b.category === '椅子' || chairScoreOf(b) >= CHAIR_CTX_FLOOR || (SAN_CATS.has(b.category) && b.score >= CHAIR_CTX_FLOOR)) candIdx.push(j);
    if (SAN_CATS.has(b.category) && b.score >= CHAIR_CTX_FLOOR) sanIdx.push(j);
  });
  if (!candIdx.length) return out;
  const faceArea = faces.map(f => (f && f.poly && f.poly.length >= 3) ? polyAreaC(f.poly) : null);
  const faceZone = new Map();
  zones.forEach(z => { for (const i of (z && z.faces) || []) if (!faceZone.has(i)) faceZone.set(i, z); });
  const wetTexts = texts.filter(t => t && WET_NAME_RE.test(String(t.t != null ? t.t : (t.s || ''))));
  const san = fixtures.filter(f => f && f.b && SAN_TYPES.has(f.t));
  for (const j of candIdx) {
    const x = clusters[j], cx = (x.b[0] + x.b[2]) / 2, cy = (x.b[1] + x.b[3]) / 2;
    let deskDist = null;
    for (const k of deskIdx) { const d = edgeDistC(x.b, clusters[k].b); if (deskDist == null || d < deskDist) deskDist = d; }
    let rep = 0;
    for (const k of repPool) {
      if (k === j) continue; const o = clusters[k];
      if (Math.abs(o.short - x.short) > repTol || Math.abs(o.long - x.long) > repTol) continue;
      if (Math.hypot((o.b[0] + o.b[2]) / 2 - cx, (o.b[1] + o.b[3]) / 2 - cy) <= CHAIR_REP_R) rep++;
    }
    /* 属する区画（一番小さい物）と、そのゾーン */
    let face = null, faceI = -1;
    faces.forEach((f, fi) => { if (f && f.poly && f.poly.length >= 3 && faceArea[fi] != null && pipC(cx, cy, f.poly) && (face == null || faceArea[fi] < faceArea[faceI])) { face = f; faceI = fi; } });
    const zone = face ? faceZone.get(face.i != null ? face.i : faceI) : null;
    let wet = false;
    /* ゾーン名の水回りは、小さい区画の時だけ根拠にする（大きな区画は複数室が混ざりうる） */
    if (zone && WET_NAME_RE.test(String(zone.name || '')) && (faceArea[faceI] == null || faceArea[faceI] <= ZONE_WET_FACE_MAX)) wet = true;
    if (!wet && face && faceArea[faceI] <= CHAIR_FACE_WET_MAX) {
      for (const t of wetTexts) { if (pipC(+t.x, +t.y, face.poly)) { wet = true; break; } }
    }
    let wetTextDist = null;
    for (const t of wetTexts) { const d = Math.hypot(+t.x - cx, +t.y - cy); if (wetTextDist == null || d < wetTextDist) wetTextDist = d; }
    if (!wet && wetTextDist != null && wetTextDist <= CHAIR_WET_TEXT_MAX) wet = true;
    let sanDist = null;
    for (const f of san) { const d = edgeDistC(x.b, f.b); if (sanDist == null || d < sanDist) sanDist = d; }
    if (!wet && sanDist != null && sanDist <= CHAIR_SAN_MAX) wet = true;
    out[j] = {
      desk: deskDist != null && deskDist <= CHAIR_DESK_MAX,
      rep: rep >= CHAIR_REP_MIN,
      office: !!(zone && OFFICE_NAME_RE.test(String(zone.name || ''))),
      wet,
      anchor: (sanDist != null && sanDist <= SAN_FIX_ANCHOR_MAX) || (wetTextDist != null && wetTextDist <= SAN_TEXT_ANCHOR_MAX),
      anchorGroup: false,
      deskDist: deskDist == null ? null : Math.round(deskDist * 100) / 100,
      repCount: rep,
      sanDist: sanDist == null ? null : Math.round(sanDist * 100) / 100,
      wetTextDist: wetTextDist == null ? null : Math.round(wetTextDist * 100) / 100
    };
  }
  /* 衛生のアンカーは、同寸法（±45mm）で中心間 2m 以内で連なる列全体に効かせる */
  if (sanIdx.length) {
    const par = new Map(sanIdx.map(j => [j, j]));
    const find = a => { while (par.get(a) !== a) { par.set(a, par.get(par.get(a))); a = par.get(a); } return a; };
    for (let a = 0; a < sanIdx.length; a++) for (let b = a + 1; b < sanIdx.length; b++) {
      const x = clusters[sanIdx[a]], y = clusters[sanIdx[b]];
      if (Math.abs(x.short - y.short) > repTol || Math.abs(x.long - y.long) > repTol) continue;
      const d = Math.hypot((x.b[0] + x.b[2]) / 2 - (y.b[0] + y.b[2]) / 2, (x.b[1] + x.b[3]) / 2 - (y.b[1] + y.b[3]) / 2);
      if (d <= CHAIR_REP_R) { const ra = find(sanIdx[a]), rb = find(sanIdx[b]); if (ra !== rb) par.set(ra, rb); }
    }
    const anchored = new Set();
    for (const j of sanIdx) if (out[j] && out[j].anchor) anchored.add(find(j));
    for (const j of sanIdx) if (out[j] && anchored.has(find(j))) out[j].anchorGroup = true;
  }
  return out;
}

/* 戻り値: { result: カテゴリ名 | "要確認" | "不明", score, category, label,
 *   second, secondScore（次点カテゴリとそのスコア）, chairScore（「椅子」カテゴリのスコア。
 *   文脈判定が「形の上では椅子も有力」かを見るために常に返す） }
 * scale（任意、既定 1）：図面の寸法の自動補正（js/symscale.js の symScale.factor）。
 *   図面の座標が実寸の scale 倍で描かれている時、寸法がらみの判定（パターンの寸法照合と
 *   sizeVeto の寸法帯）だけを実寸（short/long ÷ scale）で行う。形の特徴（円弧の割合・
 *   閉じ具合・分割線）と縦横比は縮尺で変わらないので、そのまま使う。
 *   scale が 1 の時は従来と完全に同じ結果になる。
 * opts（任意、sw.50）：{ exclude: [カテゴリ名] } を渡すと、そのカテゴリを候補から
 *   外して順位付けする。使うのは器具の形判定のタンク帯経路（classifyFixtureShape）
 *   だけで、寸法判定（classifyBox）・家具クラスタ（classifyCluster）は渡さない
 *   （＝従来と完全に同じ）。 */
export function classifySymbol(f, scale = 1, opts = null) {
  const sc = (typeof scale === 'number' && Number.isFinite(scale) && scale > 0) ? scale : 1;
  const ff = (sc === 1 || !f || !(f.short > 0) || !(f.long > 0)) ? f : { ...f, short: f.short / sc, long: f.long / sc };
  /* まずカテゴリごとの最良スコアに集約する（同じカテゴリのパターン同士は競合しない。
   * 集約しないと、同寸法のパターンを複数持つカテゴリが「僅差チェック」をすり抜けてしまう） */
  const byCat = new Map();
  for (const e of SYM_DICT) for (const p of e.patterns) {
    const s = scorePattern(p, ff);
    if (s == null) continue;
    const cur = byCat.get(e.category);
    if (!cur || s > cur.score) byCat.set(e.category, { score: s, category: e.category, kind: e.kind, label: p.label || p.origin });
  }
  if (opts && opts.exclude) for (const c of opts.exclude) byCat.delete(c);
  const hits = [...byCat.values()];
  hits.sort((a, b) => b.score - a.score);
  const extra = {
    second: hits.length > 1 ? hits[1].category : null,
    secondScore: hits.length > 1 ? hits[1].score : 0,
    chairScore: byCat.has("椅子") ? byCat.get("椅子").score : 0
  };
  if (!hits.length || hits[0].score < SYM_THRESHOLD) return { result: "不明", score: hits.length ? hits[0].score : 0, category: null, label: null, ...extra };
  /* 寸法特性の制限：形のスコアが十分でも、寸法が実在帯の外なら確定しない（類似に落とす）。
   * sizeVeto が付いた類似は、文脈判定（promoteChair）でも確定に上げない */
  const veto = sizeVetoReason(hits[0].category, ff);
  if (veto) return { result: "要確認", score: hits[0].score, category: hits[0].category, label: hits[0].label, sizeVeto: veto, ...extra };
  if (hits.length > 1 && hits[0].category !== hits[1].category && hits[0].score - hits[1].score < 0.05)
    return { result: "要確認", score: hits[0].score, category: hits[0].category, label: hits[0].label, ...extra };
  return { result: hits[0].category, score: hits[0].score, category: hits[0].category, label: hits[0].label, ...extra };
}
