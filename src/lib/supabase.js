import { createClient } from '@supabase/supabase-js'

// Variáveis de ambiente da Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Upload de arquivo para o Supabase Storage
 * @param {string} bucket
 * @param {string} path
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function uploadStorageFile(bucket, path, file) {
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true })

    if (error) {
        throw error
    }

    const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path)

    return publicUrlData.publicUrl
}

/**
 * Compressão de imagem para WebP
 * @param {File} file
 * @param {number} maxMb
 * @param {number} quality
 * @returns {Promise<File>}
 */
export async function compressToWebP(file, maxMb = 5, quality = 0.8) {

    if (file.size > maxMb * 1024 * 1024) {
        throw new Error(`A imagem excede o tamanho máximo de ${maxMb}MB.`)
    }

    return new Promise((resolve, reject) => {

        const reader = new FileReader()

        reader.onload = (event) => {

            const img = new Image()

            img.onload = () => {

                const canvas = document.createElement('canvas')
                canvas.width = img.width
                canvas.height = img.height

                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0)

                canvas.toBlob((blob) => {

                    if (!blob) {
                        return reject(new Error('Erro ao converter imagem.'))
                    }

                    const newFile = new File(
                        [blob],
                        file.name.replace(/\.[^/.]+$/, "") + '.webp',
                        {
                            type: 'image/webp',
                            lastModified: Date.now()
                        }
                    )

                    resolve(newFile)

                }, 'image/webp', quality)

            }

            img.onerror = () => reject(new Error('Erro ao carregar a imagem.'))
            img.src = event.target.result

        }

        reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'))
        reader.readAsDataURL(file)

    })
}