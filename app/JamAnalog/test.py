import math
from PIL import Image, ImageDraw, ImageFont

def buat_jam_analog_polos(ukuran=500, output_file="jam_analog.png"):
    # 1. Buat kanvas kosong berwarna putih
    # Mode 'RGB', ukuran (width, height), warna background 'white'
    img = Image.new('RGB', (ukuran, ukuran), 'white')
    draw = ImageDraw.Draw(img)
    
    # Tentukan titik tengah dan jari-jari
    center_x = ukuran // 2
    center_y = ukuran // 2
    radius_lingkaran = (ukuran // 2) - 20  # Padding 20 pixel dari pinggir
    radius_angka = radius_lingkaran - 40   # Angka agak masuk ke dalam
    
    # 2. Gambar lingkaran luar jam
    # Bounding box: (kiri, atas, kanan, bawah)
    bbox = (
        center_x - radius_lingkaran, 
        center_y - radius_lingkaran, 
        center_x + radius_lingkaran, 
        center_y + radius_lingkaran
    )
    draw.ellipse(bbox, outline='black', width=4)
    
    # 3. Setup Font
    # Mencoba menggunakan Arial, jika tidak ada pakai default (tapi kecil)
    try:
        # Ubah ukuran font sesuai ukuran gambar (kira-kira 1/15 dari ukuran gambar)
        font_size = int(ukuran / 15)
        font = ImageFont.truetype("arial.ttf", font_size)
    except IOError:
        # Fallback jika arial tidak ditemukan
        font = ImageFont.load_default()
        print("Font Arial tidak ditemukan, menggunakan font default sistem.")

    # 4. Gambar Angka 1 sampai 12
    for i in range(1, 13):
        angka = str(i)
        
        # Hitung sudut untuk setiap angka
        # 1 putaran = 360 derajat. Ada 12 angka. Jadi tiap angka berjarak 30 derajat.
        # Sudut dalam radian = derajat * (pi / 180)
        sudut_derajat = i * 30
        sudut_radian = math.radians(sudut_derajat)
        
        # Hitung koordinat (x, y) menggunakan Trigonometri
        # Sinus untuk X, Cosinus untuk Y (karena jam mulai dari atas/vertikal)
        # Y dikurang karena koordinat komputer (0,0) ada di pojok kiri atas
        x = center_x + radius_angka * math.sin(sudut_radian)
        y = center_y - radius_angka * math.cos(sudut_radian)
        
        # Gambar teks tepat di titik tersebut (menggunakan anchor 'mm' agar teks center)
        draw.text((x, y), angka, fill='black', font=font, anchor="mm")

    # 5. Simpan dan Tampilkan gambar
    img.save(output_file)
    print(f"Gambar berhasil dibuat: {output_file}")
    img.show()

# Jalankan fungsi
if __name__ == "__main__":
    buat_jam_analog_polos()