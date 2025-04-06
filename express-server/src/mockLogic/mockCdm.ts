import fs from 'fs/promises'
import path from 'path'

export async function processMockCdms(mockCdmsPath: string) {
  try {
    const files = await fs.readdir(mockCdmsPath)
    const jsonFiles = files.filter(file => file.endsWith('.json'))
    console.log(`Found ${jsonFiles.length} JSON files to process`)

    const processedFiles = await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const filePath = path.join(mockCdmsPath, file)
          const fileContent = await fs.readFile(filePath, 'utf-8')
          const jsonData = JSON.parse(fileContent)
          // Extract the first element if it's an array
          return Array.isArray(jsonData) ? jsonData[0] : jsonData
        } catch (fileError) {
          console.error(`Error processing file ${file}:`, fileError)
          return null
        }
      })
    )
    return processedFiles.filter(content => content !== null)
  } catch (error) {
    console.error('Failed to process mock CDMs:', error)
    throw error
  }
}
  