"""Tạo hàng loạt task 2.6 Tasklist cho các BST của một tháng, theo bảng 1.7 Định Mức.

Quy trình và quy tắc nghiệp vụ: docs/quy-trinh-tao-task-bst.md. Đọc file đó trước khi chạy.

Chạy trong scratchpad (lark-cli ghi file .ndjson ra thư mục hiện tại):

    export LARK_BASE_TOKEN=<base token thật, xem CLAUDE.local.md>
    python3 bst_tasks.py fetch  --config config.json   # kéo 1.7, 2.1, 2.3, 2.6 mới nhất
    python3 bst_tasks.py plan   --config config.json   # sinh plan.json + in bản xem trước, không ghi Lark
    python3 bst_tasks.py apply  --config config.json [--only "12.2026-Gracy"]   # GHI LÊN LARK
    python3 bst_tasks.py verify --config config.json   # đọc lại, đối chiếu với plan

`apply` lưu key→record_id vào created_ids.json sau mỗi lô, chạy lại sẽ bỏ qua task đã tạo.
"""
import argparse, json, os, subprocess, sys
from collections import Counter
from pathlib import Path

T_DINH_MUC, T_BST, T_SKU, T_TASK = "tblMc6k2WaTuKR5W", "tblVcNQ2GK0JgAgN", "tblQxv9Kn7SSwfg6", "tbl9EjPM6tBzpXDb"
CHUNK = 100

# Phân loại định dạng (user chốt 29/10/2026). Định dạng mới tích BST ở 1.7 mà chưa có ở đây → script dừng, hỏi user.
DEFAULT_GROUPS = {
    "per_sku": ["Video Voice", "Video Trend", "Ảnh 3D", "Graphic Ecom"],
    "per_look": ["Ảnh Lookbook", "Video MV", "Video Tripod"],  # combo làm chung 1 bộ
    "per_color": ["Video Voice", "Video Tripod"],
    "per_bst": ["Video Branding BST", "Ảnh Branding BST", "Video Behind the Scene", "Video Trailer", "Video Teaser",
                "Comming Soon Video", "Video LCD Cửa Hàng", "Comming Soon Graphic", "Shop in Shop",
                "Popup Website / Banner", "Ảnh Ấn Phẩm POSM", "Lighbox", "Template Layout BST"],
}
STAGE_PREFIX = {"Viết Content": "Viết Content", "Quay": "Quay", "Chụp": "Chụp", "Edit": "Edit",
                "Graphic Design": "Graphic", "Viết Caption": "Viết Caption"}


def lark(*args, cwd):
    token = os.environ.get("LARK_BASE_TOKEN") or sys.exit("Thiếu LARK_BASE_TOKEN")
    out = subprocess.run(["lark-cli", "base", *args, "--base-token", token, "--as", "user"],
                         capture_output=True, text=True, cwd=cwd)
    return out.stdout + out.stderr


def read_ndjson(p):
    return [json.loads(l) for l in open(p) if l.strip()]


def fetch(cfg, wd):
    def dump(table, out, fields=(), pages=1):
        rows = []
        for i in range(pages):
            f = [a for x in fields for a in ("--field-id", x)]
            lark("+record-list", "--table-id", table, *f, "--offset", str(i * 2000), "--limit", "2000",
                 "--output", f"_{out}_{i}.ndjson", "--overwrite", cwd=wd)
            part = read_ndjson(wd / f"_{out}_{i}.ndjson")
            rows += part
            if len(part) < 2000:
                break
        else:
            sys.exit(f"{out}: nhiều hơn {pages * 2000} dòng, tăng pages")
        with open(wd / f"{out}.ndjson", "w") as fh:
            fh.writelines(json.dumps(r, ensure_ascii=False) + "\n" for r in rows)
        print(f"{out}: {len(rows)} dòng")

    dump(T_DINH_MUC, "dinh_muc")
    dump(T_BST, "bst", ["ID", "Tháng", "2.6 Tasklist"])
    dump(T_SKU, "sku", ["Mã SP", "BST (Link 2.1)", "Tháng Ra Mắt", "2.6 Tasklist"])
    dump(T_TASK, "tasks", ["Công việc", "Tên Task", "Bộ Sưu Tập"], pages=10)


def build_plan(cfg, wd):
    month = cfg["month"]  # "12.2026"
    groups = {**DEFAULT_GROUPS, **cfg.get("groups", {})}
    dm = {r["Tên Định Dạng"].strip(): r for r in read_ndjson(wd / "dinh_muc.ndjson")
          if r.get("BST") and r.get("Tên Định Dạng")}
    known = set(groups["per_sku"] + groups["per_look"] + groups["per_bst"])
    if set(dm) != known:
        sys.exit(f"1.7 đổi danh sách định dạng BST, cần user phân loại: mới={set(dm) - known}, bỏ={known - set(dm)}")

    bsts = {r["ID"]: r["record_id"] for r in read_ndjson(wd / "bst.ndjson") if str(r.get("ID", "")).startswith(month)}
    skus = {r["Mã SP"]: r for r in read_ndjson(wd / "sku.ndjson") if r.get("Tháng Ra Mắt") == month}
    colors = cfg["colors"]
    if set(colors) != set(skus):
        sys.exit(f"Bảng màu lệch với 2.3: thiếu màu={set(skus) - set(colors)}, mã không có ở 2.3={set(colors) - set(skus)}")
    combos = [tuple(c) for c in cfg.get("combos", [])]
    quay_added = cfg.get("quay_added", {})

    def stages(fmt):
        r = dm[fmt]
        out = []
        if r.get("Thời gian Viết Content") and "không có content" not in (r.get("Ghi Chú") or "").lower():
            out.append(("Viết Content", r["Thời gian Viết Content"]))
        rec = r.get("Thời gian Record (Phút)") or quay_added.get(fmt)
        if rec:
            out.append(("Chụp" if fmt.startswith("Ảnh") else "Quay", rec))
        if r.get("Thời gian Edit (Phút)"):
            out.append(("Edit", r["Thời gian Edit (Phút)"]))
        if r.get("Thời gian Graphic"):
            out.append(("Graphic Design", r["Thời gian Graphic"]))
        return out, r.get("Thời Gian Viết Caption")

    def title(cd, fmt, label):
        if fmt == "Popup Website / Banner" and cd == "Graphic Design":
            return f"Graphic Banner, Popup Website/Fanpage/Zalo/ADS {label}"
        p = "Graphic + Resize (TikTok)" if (fmt == "Ảnh Lookbook" and cd == "Graphic Design") else STAGE_PREFIX[cd]
        return f"{p} {fmt} {label}"

    plan = []

    def chain(bst, fmt, label, codes):
        st, cap = stages(fmt)
        base = dict(bst=bst, bst_id=bsts[bst], fmt=fmt, fmt_id=dm[fmt]["record_id"],
                    skus=list(codes), sku_ids=[skus[c]["record_id"] for c in codes])
        prev = None
        for n, (cd, mins) in enumerate(st):
            dep = [prev] if prev else []
            if cap and n == len(st) - 1:  # Caption tạo ngay trước ấn phẩm, ấn phẩm link song song tới Caption
                ck = f"{bst}|{fmt}|{label}|Viết Caption"
                plan.append(dict(base, key=ck, cd="Viết Caption", min=cap, name=title("Viết Caption", fmt, label), dep=[]))
                dep.append(ck)
            k = f"{bst}|{fmt}|{label}|{cd}"
            plan.append(dict(base, key=k, cd=cd, min=mins, name=title(cd, fmt, label), dep=dep))
            prev = k

    in_combo = {c for cb in combos for c in cb}
    for bst in sorted(bsts, key=lambda b: cfg.get("bst_order", sorted(bsts)).index(b)):
        codes = [c for c in colors if skus[c]["BST (Link 2.1)"][0]["id"] == bsts[bst]]
        for c in codes:
            for fmt in groups["per_sku"]:
                for col in (colors[c] if fmt in groups["per_color"] else [None]):
                    chain(bst, fmt, f"{c} - {col}" if col else c, [c])
        looks = [(c,) for c in codes if c not in in_combo] + [cb for cb in combos if cb[0] in codes]
        for lk in looks:
            lab = "-".join(lk)
            cols = list(dict.fromkeys(col for c in lk for col in colors[c]))
            for fmt in groups["per_look"]:
                for col in (cols if fmt in groups["per_color"] else [None]):
                    chain(bst, fmt, f"{lab} - {col}" if col else lab, lk)
        for fmt in groups["per_bst"]:
            chain(bst, fmt, bst, [])

    assert len({t["name"] for t in plan}) == len(plan), "Trùng tên task"
    json.dump(plan, open(wd / "plan.json", "w"), ensure_ascii=False, indent=1)

    existing = Counter(b["id"] for r in read_ndjson(wd / "tasks.ndjson") for b in (r.get("Bộ Sưu Tập") or []))
    by = {t["key"]: t for t in plan}
    for bst in bsts:
        print(f"\n===== {bst}: {sum(t['bst'] == bst for t in plan)} task (đang có sẵn trên Lark: {existing[bsts[bst]]})")
        for t in plan:
            if t["bst"] == bst:
                print(f"  {t['cd']:<14}{t['min']:>5}  {t['name']:<62} ← {' ; '.join(by[d]['name'] for d in t['dep'])}")
    print("\nTổng:", len(plan), dict(Counter(t["bst"] for t in plan)))
    print("Theo công đoạn:", dict(Counter(t["cd"] for t in plan)), "| Link:", sum(len(t["dep"]) for t in plan))


def apply(cfg, wd, only):
    plan = json.load(open(wd / "plan.json"))
    if only:
        plan = [t for t in plan if t["bst"] in only]
    ids_path = wd / "created_ids.json"
    ids = json.load(open(ids_path)) if ids_path.exists() else {}
    if not ids:  # lần chạy đầu: BST phải chưa có task nào, tránh tạo trùng
        existing = Counter(b["id"] for r in read_ndjson(wd / "tasks.ndjson") for b in (r.get("Bộ Sưu Tập") or []))
        dup = {t["bst"]: existing[t["bst_id"]] for t in plan if existing[t["bst_id"]]}
        if dup:
            sys.exit(f"BST đã có task trên Lark, dừng để tránh trùng: {dup}. Chạy fetch lại hoặc hỏi user.")

    def fields(t):
        f = {"Tên Task": t["name"], "Công đoạn": t["cd"], "Format Type": [{"id": t["fmt_id"]}],
             "Bộ Sưu Tập": [{"id": t["bst_id"]}], "Số phút dự kiến": t["min"], "Trạng thái": "To Do"}
        if t["sku_ids"]:
            f["Mã sản phẩm"] = [{"id": i} for i in t["sku_ids"]]
        if t["dep"]:
            f["Task Phụ Thuộc"] = [{"id": ids[d]} for d in t["dep"]]
        return f

    def flush(batch):
        body = json.dumps({"create_records": [fields(t) for t in batch]}, ensure_ascii=False)
        raw = lark("+record-batch-create", "--table-id", T_TASK, "--json", body, cwd=wd)
        (wd / "last_response.json").write_text(raw)
        res = json.loads(raw)
        if not res.get("ok"):
            sys.exit(f"LỖI khi tạo, dừng. Phản hồi:\n{raw[:2000]}")
        rid = res["data"]["record_id_list"]
        assert len(rid) == len(batch)
        ids.update({t["key"]: r for t, r in zip(batch, rid)})
        json.dump(ids, open(ids_path, "w"), ensure_ascii=False, indent=1)
        print(f"+{len(batch)}  ({len(ids)}/{len(plan)})")

    # Đi theo thứ tự đọc của plan để mã TSK chạy liền từng chuỗi. Gom liên tiếp vào một lô
    # cho tới khi gặp task cần ID của task còn nằm trong lô hiện tại.
    batch = []
    for t in plan:
        if t["key"] in ids:
            continue
        if len(batch) >= CHUNK or any(d not in ids for d in t["dep"]):
            if batch:
                flush(batch)
            batch = []
        missing = [d for d in t["dep"] if d not in ids]
        assert not missing, f"Khâu trước chưa được tạo: {missing}"
        batch.append(t)
    if batch:
        flush(batch)
    print("XONG", len(ids))


def verify(cfg, wd):
    plan = json.load(open(wd / "plan.json"))
    ids = json.load(open(wd / "created_ids.json"))
    inv = {v: k for k, v in ids.items()}
    f = [a for x in ["Công việc", "Tên Task", "Công đoạn", "Format Type", "Mã sản phẩm", "Bộ Sưu Tập", "Trạng thái",
                     "Task Phụ Thuộc", "Số phút dự kiến"] for a in ("--field-id", x)]
    rows = {}
    for i in range(10):
        lark("+record-list", "--table-id", T_TASK, *f, "--offset", str(i * 2000), "--limit", "2000",
             "--output", f"_verify_{i}.ndjson", "--overwrite", cwd=wd)
        part = read_ndjson(wd / f"_verify_{i}.ndjson")
        rows.update({r["record_id"]: r for r in part})
        if len(part) < 2000:
            break
    bad, mins = [], Counter()
    for t in plan:
        if t["key"] not in ids:
            continue
        r = rows.get(ids[t["key"]])
        if not r:
            bad.append(("không thấy", t["name"])); continue
        checks = {
            "tên": r["Tên Task"] == t["name"],
            "công đoạn": (r["Công đoạn"] or [None])[0] == t["cd"],
            "trạng thái": (r["Trạng thái"] or [None])[0] == "To Do",
            "format": [x["id"] for x in r["Format Type"]] == [t["fmt_id"]],
            "mã SP": sorted(x["id"] for x in r["Mã sản phẩm"]) == sorted(t["sku_ids"]),
            "BST": [x["id"] for x in r["Bộ Sưu Tập"]] == [t["bst_id"]],
            # API chỉ trả chiều khâu sau → khâu trước
            "link": {inv.get(x["id"], x["id"]) for x in r["Task Phụ Thuộc"]} == set(t["dep"]),
        }
        bad += [(k, r["Công việc"], t["name"]) for k, ok in checks.items() if not ok]
        m = r["Số phút dự kiến"]
        mins[(t["cd"], "đúng 1.7" if m == t["min"] else "+10 (automation)" if m == t["min"] + 10 else f"khác: {m}")] += 1
    print("Sai lệch:", len(bad)); [print("  ", *b) for b in bad[:50]]
    for k, v in sorted(mins.items()):
        print("Số phút", k, v)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["fetch", "plan", "apply", "verify"])
    ap.add_argument("--config", required=True)
    ap.add_argument("--only", nargs="*", help="chỉ tạo các BST này, ví dụ 12.2026-Gracy")
    a = ap.parse_args()
    cfg = json.load(open(a.config))
    wd = Path.cwd()
    {"fetch": lambda: fetch(cfg, wd), "plan": lambda: build_plan(cfg, wd),
     "apply": lambda: apply(cfg, wd, a.only), "verify": lambda: verify(cfg, wd)}[a.cmd]()
