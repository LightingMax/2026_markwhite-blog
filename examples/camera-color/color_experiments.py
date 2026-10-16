"""Reproducible synthetic color-science experiments; no real camera claims."""
from pathlib import Path
import json
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "original"
FONT = Path("/System/Library/Fonts/STHeiti Light.ttc")
if FONT.exists():
    font_manager.fontManager.addfont(str(FONT))
    plt.rcParams["font.family"] = font_manager.FontProperties(fname=str(FONT)).get_name()
plt.rcParams.update({
    "font.size": 12, "axes.unicode_minus": False,
    "axes.spines.top": False, "axes.spines.right": False,
    "figure.facecolor": "#f5f8fc", "axes.facecolor": "#ffffff",
    "text.color": "#172a43", "axes.labelcolor": "#172a43",
    "savefig.facecolor": "#f5f8fc",
})


def validate_unit(x):
    x = np.asarray(x, dtype=np.float64)
    if not np.all(np.isfinite(x)) or np.any((x < 0) | (x > 1)):
        raise ValueError("Expected finite values in [0, 1]")
    return x


def srgb_decode(v):
    v = validate_unit(v)
    return np.where(v <= 0.04045, v / 12.92, ((v + 0.055) / 1.055) ** 2.4)


def srgb_encode(u):
    u = validate_unit(u)
    return np.where(u <= 0.0031308, 12.92 * u, 1.055 * u ** (1 / 2.4) - 0.055)


def gray_world(linear_rgb):
    rgb = np.asarray(linear_rgb, dtype=np.float64)
    if rgb.ndim != 3 or rgb.shape[-1] != 3 or not np.all(np.isfinite(rgb)):
        raise ValueError("Expected finite H x W x 3 linear RGB")
    means = rgb.mean(axis=(0, 1))
    if np.any(means <= 0):
        raise ValueError("All channel means must be positive")
    gains = means[1] / means
    return rgb * gains, gains


def footer(fig, text):
    fig.text(0.055, 0.025, text, fontsize=10, color="#526779")


def save(fig, name):
    fig.savefig(OUT / name, dpi=170)
    plt.close(fig)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    points = np.unique(np.r_[np.linspace(0, 1, 4097), 0.04045,
                             0.04045-1e-8, 0.04045+1e-8])
    error = float(np.max(np.abs(srgb_encode(srgb_decode(points)) - points)))
    assert error < 5e-8
    assert abs(float(srgb_decode(0.5)) - 0.21404114048223255) < 1e-12
    assert abs(float(srgb_encode(0.5)) - 0.7353569830524495) < 1e-12
    to_xyz = np.array([[.4124564, .3575761, .1804375],
                       [.2126729, .7151522, .0721750],
                       [.0193339, .1191920, .9503041]])
    to_rgb = np.array([[3.2404542, -1.5371385, -.4985314],
                       [-.9692660, 1.8760108, .0415560],
                       [.0556434, -.2040259, 1.0572252]])
    white = to_xyz @ np.ones(3)
    assert np.allclose(white, [.95047, 1, 1.08883], atol=2e-7)
    matrix_error = float(np.max(np.abs(to_rgb @ to_xyz - np.eye(3))))
    assert matrix_error < 3e-7

    linear = np.linspace(0, 1, 500)
    fig, ax = plt.subplots(figsize=(11, 6.2))
    fig.subplots_adjust(left=.1, right=.96, bottom=.16, top=.84)
    ax.plot(linear, srgb_encode(linear), lw=3, color="#087e8b", label="sRGB 精确编码")
    ax.plot(linear, linear, "--", lw=1.6, color="#8394a5", label="线性参考：输出 = 输入")
    ax.scatter([.5], [srgb_encode(.5)], color="#e77a37", s=75, zorder=4)
    ax.annotate("线性 0.5 → 编码 0.735", (.5, float(srgb_encode(.5))),
                xytext=(.55, .60), arrowprops={"arrowstyle": "->", "color": "#e77a37"})
    ax.set(xlabel="线性 sRGB 分量（0～1）", ylabel="编码 sRGB 分量（0～1）",
           xlim=(0, 1), ylim=(0, 1))
    ax.grid(alpha=.18)
    ax.legend(loc="upper left")
    fig.suptitle("sRGB 编码不是简单的数值归一化", fontsize=22, x=.055, ha="left")
    footer(fig, "按标准分段函数生成；编码 0.5 解码约为 0.214。图示不代表完整相机响应。")
    save(fig, "03_srgb_curve.png")

    encoded_mean = .5
    physical_mean = float(srgb_encode(.5))
    fig, axes = plt.subplots(1, 2, figsize=(11, 5.3))
    fig.subplots_adjust(left=.07, right=.94, top=.73, bottom=.24, wspace=.2)
    for ax, val, title in zip(axes, [encoded_mean, physical_mean],
                             ["先编码，再平均", "先在线性域平均，再编码"]):
        ax.imshow(np.full((100, 190, 3), val), vmin=0, vmax=1)
        ax.axis("off")
        ax.set_title(title, fontsize=16, pad=14)
        ax.text(.5, -.16, f"编码值 {val:.6f}  |  8 位约 {round(val*255)}",
                transform=ax.transAxes, ha="center", fontsize=14)
    fig.suptitle("黑 + 白，等权混合：为什么 128 与 188 不同？",
                 fontsize=21, x=.055, ha="left")
    footer(fig, "合成两像素实验。右图对应光量意义上的平均；两幅色块均以最终编码值显示。")
    save(fig, "06_nonlinearity.png")

    measured = np.array([.2, .4, .1])
    gains = measured[1] / measured
    balanced = measured*gains
    fig, axes = plt.subplots(1, 2, figsize=(11, 6))
    fig.subplots_adjust(left=.08, right=.94, top=.75, bottom=.22, wspace=.26)
    for ax, v, title in zip(axes, [measured, balanced], ["中性区域：校正前", "对角增益：校正后"]):
        ax.bar(["R", "G", "B"], v, color=["#ce535a", "#30a58a", "#487ab5"], width=.55)
        ax.set_ylim(0, .53)
        ax.set_title(title, pad=15, fontsize=16)
        ax.set_ylabel("线性通道响应（任意归一化单位）")
        for x, y in enumerate(v):
            ax.text(x, y+.015, f"{y:.1f}", ha="center", fontsize=14)
    fig.suptitle("白平衡：将中性参照的三个通道调到相同比例",
                 fontsize=21, x=.045, ha="left")
    fig.text(.5, .12, "增益 = (2, 1, 4)     →     (0.2, 0.4, 0.1) 变为 (0.4, 0.4, 0.4)",
             ha="center", fontsize=13)
    footer(fig, "理想对角模型的合成数值；这不是相机 RGB 到标准色彩空间的标定。")
    save(fig, "05_white_balance.png")

    # Same distribution in all base channels: Gray-world holds by construction.
    base = np.linspace(.05, .5, 4096).reshape(64, 64, 1) * np.ones(3)
    illumination = np.array([.6, 1., .4])
    restored, estimated_gains = gray_world(base*illumination)
    assert np.max(np.abs(restored-base)) < 1e-12
    render = lambda x: x/(1+x)
    correct = render(.4)
    post_corrected = render(.4*2)/2
    assert not np.isclose(correct, post_corrected)
    raw_normalized = (1088.-64.)/(4095.-64.)
    weight = (1/4300 - 1/6500)/(1/2500 - 1/6500)

    rng = np.random.default_rng(20261002)
    levels = np.linspace(.005, .9, 18)
    count_scale, read_std, samples = 1500., .004, 100000
    empirical = []
    for s in levels:
        obs = rng.poisson(s*count_scale, samples)/count_scale
        obs += rng.normal(0, read_std, samples)
        empirical.append(float(np.var(obs-s, ddof=1)))
    theoretical = levels/count_scale + read_std**2
    rel_error = np.abs(np.array(empirical)/theoretical-1)
    assert np.max(rel_error) < .04
    fig, ax = plt.subplots(figsize=(11, 6.2))
    fig.subplots_adjust(left=.12, right=.95, top=.83, bottom=.17)
    ax.plot(levels, theoretical, color="#087e8b", lw=2.5, label="理论：s/N + 读出噪声方差")
    ax.scatter(levels, empirical, color="#e77a37", s=40, zorder=3, label="合成采样统计")
    ax.set(xlabel="归一化线性信号 s", ylabel="噪声方差（归一化值²）")
    ax.ticklabel_format(axis="y", style="sci", scilimits=(0, 0))
    ax.grid(alpha=.18)
    ax.legend(loc="upper left")
    fig.suptitle("噪声不是总具有固定方差", fontsize=23, x=.055, ha="left")
    footer(fig, "Poisson-Gaussian 合成模型；N = 1500，读出噪声标准差 = 0.004；未裁剪，固定随机种子。")
    save(fig, "07_noise_variance.png")

    results = {
        "scope": "Synthetic teaching experiments; not real camera or paper replication",
        "seed": 20261002,
        "srgb_decode_0_5": float(srgb_decode(.5)),
        "srgb_encode_0_5": physical_mean,
        "srgb_roundtrip_max_abs_error": error,
        "encoded_average_8bit": round(encoded_mean*255),
        "linear_average_encoded_8bit": round(physical_mean*255),
        "linear_srgb_white_to_xyz": white.tolist(),
        "matrix_roundtrip_max_abs_error": matrix_error,
        "gray_world_ideal_gains": estimated_gains.tolist(),
        "wb_then_render": correct, "render_then_wb_correction": post_corrected,
        "noncommutativity_abs_difference": abs(correct-post_corrected),
        "raw_normalization_example": raw_normalized,
        "inverse_temperature_weight_4300K": weight,
        "noise_count_scale": count_scale, "noise_read_std": read_std,
        "noise_samples_per_level": samples, "noise_signal_levels": levels.tolist(),
        "noise_theoretical_variance": theoretical.tolist(),
        "noise_empirical_variance": empirical,
        "noise_max_relative_variance_error": float(np.max(rel_error)),
        "checks_passed": True
    }
    (ROOT / "examples/results.json").write_text(json.dumps(results, indent=2)+"\n")
    print(json.dumps({k: v for k, v in results.items() if not isinstance(v, list)}, indent=2))


if __name__ == "__main__":
    main()
