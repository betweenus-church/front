/** Upload optimization only; the API validates and compresses the stored image again. */
export async function compressCoverImage(file: File): Promise<File> {
    const objectUrl = URL.createObjectURL(file);
    try {
        const image = new Image();
        image.src = objectUrl;
        await image.decode();
        const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("이미지를 처리할 수 없어요.");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.8));
        if (!blob || blob.type !== "image/webp") throw new Error("이미지를 처리할 수 없어요.");
        if (blob.size >= file.size) return file;
        return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}
