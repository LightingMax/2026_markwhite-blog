# /// script
# requires-python = ">=3.14,<3.15"
# dependencies = ["torch==2.14.1", "torchvision==0.29.2", "pillow>=11,<13", "numpy>=2,<3"]
# ///
"""Reproduce the RGB and real CNN feature assets: uv run generate_features.py.

Input: scikit-image's public-domain NASA astronaut image (Eileen Collins).
Eight translated crops simulate a camera pan; they are not a recorded video.
Features: ImageNet ResNet18 conv1 -> bn1 -> relu, before maxpool.
This is a TSM operation demonstration, not a trained TSM checkpoint.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
import torch
from torchvision.models import resnet18, ResNet18_Weights
from torchvision.transforms.functional import to_tensor, normalize

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/assets/video-understanding'
OUT.mkdir(parents=True, exist_ok=True)
source = Image.open(OUT / 'astronaut-source.png').convert('RGB')
# Same scene at successively shifted horizontal crop positions, then resized.
frames = [source.crop((i * 24, 40, i * 24 + 336, 376)).resize((224,224), Image.Resampling.LANCZOS) for i in range(8)]
for i, frame in enumerate(frames, 1):
    frame.save(OUT / f'frame-{i}.webp', lossless=True)
rgb = np.asarray(frames[3])
for c, name in enumerate(['r','g','b']):
    plane = rgb[:,:,c]
    tinted = np.zeros_like(rgb); tinted[:,:,c] = plane
    Image.fromarray(tinted).save(OUT / f'rgb-{name}.webp', lossless=True)
    Image.fromarray(plane).save(OUT / f'gray-{name}.webp', lossless=True)
model = resnet18(weights=ResNet18_Weights.IMAGENET1K_V1, progress=False).eval()
x = torch.stack([normalize(to_tensor(f), [0.485,0.456,0.406], [0.229,0.224,0.225]) for f in frames])
with torch.inference_mode():
    f = model.relu(model.bn1(model.conv1(x)))
assert tuple(f.shape) == (8,64,112,112)
# One scale per channel shared across all frames preserves temporal comparisons.
scales = f.amax(dim=(0,2,3)).clamp_min(1e-12)
a = ((f / scales[None,:,None,None]).sqrt() * 255).round().byte().numpy()
for t in range(8):
    for c in range(64):
        Image.fromarray(a[t,c]).save(OUT / f'f{t+1}-c{c}.webp', lossless=True)
# Verify the displayed shift is a whole-plane copy, including zero boundaries.
shifted = torch.zeros_like(f)
shifted[:-1,:8] = f[1:,:8]
shifted[1:,8:16] = f[:-1,8:16]
shifted[:,16:] = f[:,16:]
assert torch.equal(shifted[3,0],f[4,0])
assert torch.equal(shifted[3,8],f[2,8])
assert torch.equal(shifted[3,16:],f[3,16:])
assert not shifted[-1,:8].any() and not shifted[0,8:16].any()
Image.new('L',(112,112),0).save(OUT/'zero.webp',lossless=True)
(OUT/'manifest.json').write_text(json.dumps({'model':'torchvision ResNet18 IMAGENET1K_V1', 'layer':'conv1 -> bn1 -> relu (before maxpool)', 'shape':list(f.shape), 'input':'8 simulated pan frames from NASA astronaut photograph', 'display':'grayscale, ReLU >= 0; shared per-channel maximum across eight frames, then sqrt display gamma to reveal weak responses', 'trained_tsm':False, 'verified_whole_plane_shift':True},indent=2)+'\n')
print('Generated 8 RGB frames and 512 real 112x112 feature maps; whole-plane shift checks passed.')
