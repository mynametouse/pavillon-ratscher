#!/bin/bash
# batch.sh <outdir> [extra args for process.py]
S=${PAV_WORK:-$(cd "$(dirname "$0")/../.." && pwd)}; W=$S/assets/_tex_work/dl; O=$1; shift; X="$@"
mkdir -p $O
P="python3 -I $S/scripts/process.py"
run(){ $P "$@" $X > $O/_log_$3.json & }
run $W/ph_hinoki_planks_2k $O larch --metal 0
run $W/ph_brown_planks_03_2k $O deck --metal 0
run $W/ph_wood_floor_2k $O oak --metal 0
run $W/ph_patterned_clay_plaster_2k $O clay --metal 0
run $W/ph_granite_tile_2k $O slate --metal 0
run $W/ph_concrete_floor_02_2k $O concrete --metal 0
run $W/acg_Gravel043_2k $O gravel --metal 0
run $W/acg_Grass004_2k $O lawn --metal 0 --rough_affine 0.55,0.45
run $W/ph_forest_leaves_02_2k $O forestfloor --metal 0
wait
run $W/ph_rock_08_2k $O flagstone --metal 0
run $W/ph_rough_linen_2k $O linen --metal 0 --recolor 190,176,152
run $W/ph_curly_teddy_natural_2k $O wool --metal 0 --desat 0.4
run $W/acg_Metal046A_2k $O blacksteel --colmul 0.62 --rough_affine 0.28,0.75
run $W/ph_corrugated_iron_2k $O roofmetal
run $W/ph_clay_roof_tiles_03_2k $O rooftiles --metal 0
run $W/ph_painted_plaster_wall_2k $O plaster_ext --metal 0
run $W/ph_tree_bark_03_2k $O bark --metal 0
wait
