#!/usr/bin/env python3
# ORDER 044 §2 — apply the tier-3 correction proposal.
#
# Consumes classifications from
#   BUILDING_OVERLAP_CORRECTION_PROPOSAL_ORDER_040_S6.md §5, §6
# and applies them to
#   frontend/src/strategic/data/grythyttan-world.json
#
# The 8 church intrusions were removed in a prior commit. This script
# handles the remaining 26 pairs on the V21 exception list.
#
# Run: python3 scripts/order-044-apply-overlaps.py

import json
import subprocess
from shapely.geometry import Polygon
from shapely.affinity import translate

WORLD = "frontend/src/strategic/data/grythyttan-world.json"

def load():
    with open(WORLD) as f:
        return json.load(f)

def save(world):
    # Match the original single-line format: no indent, separators
    # `, ` and `: ` to keep the file readable-ish while staying on a
    # single line (the file was authored this way).
    with open(WORLD, "w") as f:
        json.dump(world, f, ensure_ascii=False, separators=(", ", ": "))

def poly_of(b):
    return Polygon(b["poly"])

def coords_from_poly(p):
    return [[round(x, 2), round(y, 2)] for x, y in p.exterior.coords[:-1]]

# ---------- actions --------------------------------------------------------

removed = []
nudged = []

def remove(world, byid, mid):
    if mid not in byid:
        return
    world["buildings"] = [b for b in world["buildings"] if b["id"] != mid]
    del byid[mid]
    removed.append(mid)

# Safety threshold — a "new tier-3 overlap" is area > 5 m² AND fraction
# > 5 % of the smaller polygon, matching V21's rule.
TIER3_AREA = 5.0
TIER3_FRAC = 0.05

def _tier3_neighbours(world, byid, mp, mover_id, ref_id):
    """Return list of (other_id, area, fraction) tier-3 overlaps that
    the proposed mover polygon `mp` creates against every building
    other than the mover itself and the reference (ref is the pair we're
    trying to resolve — overlap with ref is what we're already handling).
    """
    hits = []
    for other in world["buildings"]:
        if other["id"] in (mover_id, ref_id):
            continue
        op = poly_of(other)
        if not mp.intersects(op):
            continue
        inter = mp.intersection(op)
        if inter.is_empty:
            continue
        a = inter.area
        if a < TIER3_AREA:
            continue
        smaller = min(mp.area, op.area)
        if smaller <= 0:
            continue
        f = a / smaller
        if f >= TIER3_FRAC:
            hits.append((other["id"], round(a, 2), round(f * 100, 1)))
    return hits

nudge_failed = []

def nudge_away(world, byid, mover_id, ref_id, step=1.5, max_iters=30):
    """Attempt to nudge `mover_id` away from `ref_id`. If the resulting
    position would introduce a NEW tier-3 overlap with any third
    building, roll back — the mover is deleted instead per the
    proposal's default ("if the building is wrong, nudging is wrong;
    prefer remove"). Records the failure for the report.
    """
    mover = byid.get(mover_id)
    ref = byid.get(ref_id)
    if mover is None or ref is None:
        return
    original_poly = list(mover["poly"])
    mp = poly_of(mover)
    rp = poly_of(ref)
    total_dx, total_dy = 0.0, 0.0
    for _ in range(max_iters):
        if not mp.intersects(rp) or mp.intersection(rp).area < 0.5:
            break
        rcx, rcy = rp.centroid.x, rp.centroid.y
        mcx, mcy = mp.centroid.x, mp.centroid.y
        dx, dy = mcx - rcx, mcy - rcy
        d = (dx * dx + dy * dy) ** 0.5
        if d < 1e-3:
            dx, dy = 1.0, 0.0
        else:
            dx, dy = dx / d, dy / d
        mp = translate(mp, xoff=dx * step, yoff=dy * step)
        total_dx += dx * step
        total_dy += dy * step

    collisions = _tier3_neighbours(world, byid, mp, mover_id, ref_id)
    if collisions:
        # Rollback + fall through to remove. The nudge would create
        # new tier-3 overlaps with real (OSM) or synthetic buildings.
        mover["poly"] = original_poly
        nudge_failed.append((mover_id, ref_id, collisions))
        remove(world, byid, mover_id)
        return
    mover["poly"] = coords_from_poly(mp)
    nudged.append((mover_id, ref_id, round(total_dx, 2), round(total_dy, 2)))

# ---------- the plan (per proposal §5 & §6) --------------------------------

def main():
    world = load()
    byid = {b["id"]: b for b in world["buildings"]}

    # Unambiguous removes: intruder is 100 % inside a container, redundant
    # with an OSM footprint that already models the house, or one of two
    # vw × vw records describing the same building.
    for rid in [
        "vw-kyr-1-booth",           # 100 % inside vw-kyr-torget-lh
        "vw-torget-bus-shelter",    # 100 % inside vw-kyr-torget-lh
        "vw-pra-12s",               # 90 % inside OSM w193810941
        "vw-skg-11",                # await-ground-truth; default remove per §4
        "vw-stn-8",                 # redundant with OSM w870510842
        "vw-torget-east-lh",        # redundant with OSM w869907976 + w869907977
        "vw-torget-north-lh",       # redundant with OSM w869907971
        "vw-pra-20s",               # 83 % overlap with vw-pra-21; remove one
    ]:
        remove(world, byid, rid)

    # Nudges — move the descriptively-secondary member of each pair away
    # from the other's centroid. Order matters where a member appears in
    # multiple pairs; sequence walks from stronger to weaker overlaps.
    nudge_away(world, byid, "vw-bv-lakeshore-boathouse", "vw-bv-lakeshore",     step=1.5)
    nudge_away(world, byid, "vw-bv-tree-garage",         "vw-bv-tree-cluster",  step=1.5)
    nudge_away(world, byid, "vw-kyr-1",                  "vw-kyr-torget-lh",    step=1.5)
    nudge_away(world, byid, "vw-kyr-14",                 "vw-kyr-12",           step=1.0)
    nudge_away(world, byid, "vw-kyr-20-garage",          "vw-kyr-20",           step=1.5)
    nudge_away(world, byid, "vw-kyr-22",                 "vw-kyr-20",           step=1.5)
    nudge_away(world, byid, "vw-kyr-26",                 "vw-kyr-22",           step=1.5)
    nudge_away(world, byid, "vw-kyr-5-barn",             "vw-kyr-5",            step=1.5)
    nudge_away(world, byid, "vw-nyg-1",                  "w869907972",          step=1.5)
    nudge_away(world, byid, "vw-nyg-20",                 "w870510857",          step=1.5)
    nudge_away(world, byid, "vw-pra-19n",                "vw-pra-16",           step=1.5)
    nudge_away(world, byid, "vw-pra-6n",                 "vw-pra-4n",           step=1.5)
    nudge_away(world, byid, "vw-pra-4n",                 "vw-pra-8",            step=1.0)
    nudge_away(world, byid, "vw-pra-6n",                 "vw-pra-8",            step=1.0)
    nudge_away(world, byid, "vw-skg-9",                  "w1250001244",         step=1.5)

    save(world)

    print(f"\nRemoved ({len(removed)}):")
    for rid in removed:
        print(f"  - {rid}")
    print(f"\nNudged ({len(nudged)}):")
    for mid, rid, dx, dy in nudged:
        print(f"  ~ {mid:30s} away from {rid:25s} dx={dx:6.2f} dy={dy:6.2f}")
    if nudge_failed:
        print(f"\nNudge → remove fallback ({len(nudge_failed)}):")
        for mid, rid, collisions in nudge_failed:
            print(f"  ! {mid:30s} would have collided with:")
            for cid, ca, cf in collisions:
                print(f"      {cid:25s}  {ca} m² ({cf}%)")

if __name__ == "__main__":
    main()
