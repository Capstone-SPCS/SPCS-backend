import fs from 'fs/promises';
import path from 'path';
import { processMockCdms } from '../../mockLogic/mockCdm';

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
  readFile: jest.fn()
}));

describe('processMockCdms', () => {
  const mockCdmPath = '/mock/path';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should process CDM files successfully', async () => {
    // Mock file list
    (fs.readdir as jest.Mock).mockResolvedValue([
      'file1.json',
      'file2.json',
      'notjson.txt'
    ]);
    
    // Mock file contents
    const mockCdm1 = { 
      TCA: '2025-01-26T02:41:56.000',
      SAT1_OBJECT_DESIGNATOR: '39088',
      SAT2_OBJECT_DESIGNATOR: '27843',
      COLLISION_PROBABILITY: '1e-30',
      MISS_DISTANCE: '2926',
      SAT1_X: '5817.129864485999',
      SAT1_Y: '3973.9199223267437',
      SAT1_Z: '1283.6652354393732',
      SAT2_X: '11634.541928971998',
      SAT2_Y: '7949.533444653487',
      SAT2_Z: '2569.7000708787464',
      SAT1_CN_N: '62.56572773883462',
      SAT1_CR_R: '338.1498027941108',
      SAT1_CT_T: '70533.59371748369',
      SAT2_CN_N: '37.7113236915332',
      SAT2_CR_R: '263.5498269984581',
      SAT2_CT_T: '218581.78480988496',
      CREATION_DATE: '2025-01-19T03:38:05.831'
    };
    
    const mockCdm2 = { 
      TCA: '2025-01-27T03:41:56.000',
      SAT1_OBJECT_DESIGNATOR: '39089',
      SAT2_OBJECT_DESIGNATOR: '27844',
      COLLISION_PROBABILITY: '1e-30',
      MISS_DISTANCE: '2927',
      SAT1_X: '5818.129864485999',
      SAT1_Y: '3974.9199223267437',
      SAT1_Z: '1284.6652354393732',
      SAT2_X: '11635.541928971998',
      SAT2_Y: '7950.533444653487',
      SAT2_Z: '2570.7000708787464',
      SAT1_CN_N: '63.56572773883462',
      SAT1_CR_R: '339.1498027941108',
      SAT1_CT_T: '70534.59371748369',
      SAT2_CN_N: '38.7113236915332',
      SAT2_CR_R: '264.5498269984581',
      SAT2_CT_T: '218582.78480988496',
      CREATION_DATE: '2025-01-20T03:38:05.831'
    };
    
    (fs.readFile as jest.Mock)
      .mockImplementation((filePath: string) => {
        if (filePath.endsWith('file1.json')) {
          return Promise.resolve(JSON.stringify(mockCdm1));
        } else if (filePath.endsWith('file2.json')) {
          return Promise.resolve(JSON.stringify(mockCdm2));
        }
        return Promise.reject(new Error('File not found'));
      });
    
    const result = await processMockCdms(mockCdmPath);
    
    // Verify results
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(mockCdm1);
    expect(result[1]).toEqual(mockCdm2);
    
    // Verify function calls
    expect(fs.readdir).toHaveBeenCalledWith(mockCdmPath);
    expect(fs.readFile).toHaveBeenCalledTimes(2);
  });
  
  it('should handle array data in JSON files', async () => {
    // Mock file list
    (fs.readdir as jest.Mock).mockResolvedValue(['file1.json']);
    
    // Mock file with array data
    const mockCdmData = { 
      TCA: '2025-01-26T02:41:56.000',
      SAT1_OBJECT_DESIGNATOR: '39088'
    };
    
    (fs.readFile as jest.Mock)
      .mockResolvedValue(JSON.stringify([mockCdmData]));
    
    const result = await processMockCdms(mockCdmPath);
    
    // Should extract first element from array
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(mockCdmData);
  });
  
  it('should handle file reading errors', async () => {
    // Mock file list
    (fs.readdir as jest.Mock).mockResolvedValue(['file1.json', 'file2.json']);
    
    // Mock file reading with error for second file
    (fs.readFile as jest.Mock)
      .mockImplementation((filePath: string) => {
        if (filePath.endsWith('file1.json')) {
          return Promise.resolve(JSON.stringify({ data: 'test' }));
        } else {
          return Promise.reject(new Error('Read error'));
        }
      });
    
    const result = await processMockCdms(mockCdmPath);
    
    // Should only return data from successfully read file
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ data: 'test' });
  });
  
  it('should handle JSON parsing errors', async () => {
    // Mock file list
    (fs.readdir as jest.Mock).mockResolvedValue(['file1.json', 'file2.json']);
    
    // Mock file with invalid JSON
    (fs.readFile as jest.Mock)
      .mockImplementation((filePath: string) => {
        if (filePath.endsWith('file1.json')) {
          return Promise.resolve(JSON.stringify({ data: 'test' }));
        } else {
          return Promise.resolve('invalid json');
        }
      });
    
    const result = await processMockCdms(mockCdmPath);
    
    // Should only return data from successfully parsed file
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ data: 'test' });
  });
  
  it('should handle directory reading errors', async () => {
    // Mock readdir error
    (fs.readdir as jest.Mock).mockRejectedValue(new Error('Directory error'));
    
    // Should throw error
    await expect(processMockCdms(mockCdmPath)).rejects.toThrow('Directory error');
  });
}); 