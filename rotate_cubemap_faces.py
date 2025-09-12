#!/usr/bin/env python3
"""
Скрипт для поворота верхней (u.jpg) и нижней (d.jpg) граней кубической панорамы на 180 градусов.
Использование: python rotate_cubemap_faces.py [путь_к_папке]
Если путь не указан, используется ./public/vr/willow/
"""

import os
import sys
from PIL import Image

def rotate_face(file_path):
    """Поворачивает изображение на 180 градусов и сохраняет его"""
    try:
        # Открываем изображение
        img = Image.open(file_path)
        
        # Поворачиваем на 180 градусов
        rotated_img = img.rotate(180)
        
        # Создаем имя для сохранения (добавляем _rotated перед расширением)
        base, ext = os.path.splitext(file_path)
        output_path = f"{base}_rotated{ext}"
        
        # Сохраняем повернутое изображение
        rotated_img.save(output_path)
        
        print(f"✅ Изображение повернуто и сохранено как: {output_path}")
        return output_path
    except Exception as e:
        print(f"❌ Ошибка при обработке {file_path}: {e}")
        return None

def main():
    # Определяем путь к папке с гранями кубической панорамы
    if len(sys.argv) > 1:
        base_path = sys.argv[1]
    else:
        base_path = os.path.join("public", "vr", "willow")
    
    # Проверяем существование папки
    if not os.path.isdir(base_path):
        print(f"❌ Папка {base_path} не существует")
        return
    
    print(f"🔄 Обрабатываем грани в папке: {base_path}")
    
    # Пути к верхней и нижней граням
    top_face_path = os.path.join(base_path, "u.jpg")
    bottom_face_path = os.path.join(base_path, "d.jpg")
    
    # Проверяем существование файлов
    if not os.path.isfile(top_face_path):
        print(f"❌ Файл верхней грани {top_face_path} не найден")
    else:
        rotated_top = rotate_face(top_face_path)
        if rotated_top:
            print(f"ℹ️ Чтобы использовать повернутое изображение, переименуйте {os.path.basename(rotated_top)} в u.jpg")
    
    if not os.path.isfile(bottom_face_path):
        print(f"❌ Файл нижней грани {bottom_face_path} не найден")
    else:
        rotated_bottom = rotate_face(bottom_face_path)
        if rotated_bottom:
            print(f"ℹ️ Чтобы использовать повернутое изображение, переименуйте {os.path.basename(rotated_bottom)} в d.jpg")
    
    print("\n✨ Готово! Теперь вы можете использовать повернутые грани в вашей кубической панораме.")
    print("📝 Примечание: После замены файлов, вы можете убрать параметр flipTopBottom: true в компоненте CubePanoramaViewer.")

if __name__ == "__main__":
    main()



