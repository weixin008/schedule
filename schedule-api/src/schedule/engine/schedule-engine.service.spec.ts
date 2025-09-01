import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduleEngineService } from './schedule-engine.service';
import { PersonnelSelectorService } from './personnel-selector.service';
import { RotationStateManagerService } from './rotation-state-manager.service';
import { ConflictDetectorService } from './conflict-detector.service';
import { Schedule } from '../entities/schedule.entity';
import { ScheduleRule } from '../../schedule-rule/entities/schedule-rule.entity';

describe('ScheduleEngineService', () => {
  let service: ScheduleEngineService;
  let scheduleRepository: Repository<Schedule>;
  let scheduleRuleRepository: Repository<ScheduleRule>;
  let personnelSelector: PersonnelSelectorService;
  let rotationStateManager: RotationStateManagerService;
  let conflictDetector: ConflictDetectorService;

  const mockScheduleRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockScheduleRuleRepository = {
    findOne: jest.fn(),
  };

  const mockPersonnelSelector = {
    selectPersonnelForRole: jest.fn(),
    selectGroupsForRole: jest.fn(),
  };

  const mockRotationStateManager = {
    initializeRotationState: jest.fn(),
    getNextPersonAssignment: jest.fn(),
    getNextGroupAssignment: jest.fn(),
    updateRotationState: jest.fn(),
  };

  const mockConflictDetector = {
    detectDailyConflicts: jest.fn(),
    resolveConflicts: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleEngineService,
        {
          provide: getRepositoryToken(Schedule),
          useValue: mockScheduleRepository,
        },
        {
          provide: getRepositoryToken(ScheduleRule),
          useValue: mockScheduleRuleRepository,
        },
        {
          provide: PersonnelSelectorService,
          useValue: mockPersonnelSelector,
        },
        {
          provide: RotationStateManagerService,
          useValue: mockRotationStateManager,
        },
        {
          provide: ConflictDetectorService,
          useValue: mockConflictDetector,
        },
      ],
    }).compile();

    service = module.get<ScheduleEngineService>(ScheduleEngineService);
    scheduleRepository = module.get<Repository<Schedule>>(getRepositoryToken(Schedule));
    scheduleRuleRepository = module.get<Repository<ScheduleRule>>(getRepositoryToken(ScheduleRule));
    personnelSelector = module.get<PersonnelSelectorService>(PersonnelSelectorService);
    rotationStateManager = module.get<RotationStateManagerService>(RotationStateManagerService);
    conflictDetector = module.get<ConflictDetectorService>(ConflictDetectorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateSchedule', () => {
    const mockRule = {
      id: 1,
      name: '测试规则',
      rotationType: 'DAILY',
      timeConfig: {
        shifts: [
          { id: 1, name: '早班', startTime: '08:00', endTime: '16:00' }
        ],
        workDays: [1, 2, 3, 4, 5],
        skipHolidays: false
      },
      roleConfig: {
        roles: [
          { id: 1, name: '值班员', assignmentType: 'SINGLE', isRequired: true }
        ],
        allowEmpty: false
      },
      rotationConfig: {
        mode: 'SEQUENTIAL',
        cycle: 1,
        startDate: new Date()
      },
      constraints: {
        maxConsecutiveDays: 3,
        minRestHours: 12,
        maxWorkHoursPerWeek: 40,
        forbiddenCombinations: []
      }
    };

    const mockRotationState = {
      ruleId: 1,
      currentIndex: new Map(),
      lastAssignmentDate: null,
      assignmentHistory: [],
      groupRotationIndex: new Map()
    };

    it('should generate schedule successfully', async () => {
      // Arrange
      const startDate = new Date('2025-01-27');
      const endDate = new Date('2025-01-31');
      
      mockScheduleRuleRepository.findOne.mockResolvedValue(mockRule);
      mockScheduleRepository.find.mockResolvedValue([]);
      mockRotationStateManager.initializeRotationState.mockResolvedValue(mockRotationState);
      mockPersonnelSelector.selectPersonnelForRole.mockResolvedValue([
        { id: 1, name: '张三', status: 'AVAILABLE' }
      ]);
      mockRotationStateManager.getNextPersonAssignment.mockResolvedValue({
        type: 'PERSON',
        person: { id: 1, name: '张三' }
      });
      mockConflictDetector.detectDailyConflicts.mockResolvedValue([]);
      mockConflictDetector.resolveConflicts.mockResolvedValue([]);

      // Act
      const result = await service.generateSchedule({
        ruleId: 1,
        startDate,
        endDate
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.schedules).toBeDefined();
      expect(result.statistics).toBeDefined();
      expect(result.statistics.totalDays).toBeGreaterThan(0);
      expect(mockScheduleRuleRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockRotationStateManager.initializeRotationState).toHaveBeenCalledWith(mockRule);
    });

    it('should throw error when rule not found', async () => {
      // Arrange
      mockScheduleRuleRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.generateSchedule({
        ruleId: 999,
        startDate: new Date(),
        endDate: new Date()
      })).rejects.toThrow('Schedule rule with ID 999 not found');
    });

    it('should throw error when schedules already exist and forceRegenerate is false', async () => {
      // Arrange
      mockScheduleRuleRepository.findOne.mockResolvedValue(mockRule);
      mockScheduleRepository.find.mockResolvedValue([{ id: 1 }]); // 存在排班

      // Act & Assert
      await expect(service.generateSchedule({
        ruleId: 1,
        startDate: new Date(),
        endDate: new Date(),
        forceRegenerate: false
      })).rejects.toThrow('Schedules already exist for this period');
    });
  });

  describe('previewScheduleRule', () => {
    it('should preview schedule rule successfully', async () => {
      // Arrange
      const mockRule = {
        id: 1,
        name: '测试规则',
        description: '测试描述',
        rotationType: 'DAILY'
      };
      
      mockScheduleRuleRepository.findOne.mockResolvedValue(mockRule);
      
      // Mock generateSchedule method
      jest.spyOn(service, 'generateSchedule').mockResolvedValue({
        schedules: [],
        conflicts: [],
        warnings: [],
        statistics: {
          totalDays: 7,
          scheduledDays: 5,
          emptyDays: 2,
          conflictDays: 0
        }
      });

      // Act
      const result = await service.previewScheduleRule(
        1,
        new Date('2025-01-27'),
        new Date('2025-02-02'),
        7
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.rule).toBeDefined();
      expect(result.rule.id).toBe(1);
      expect(result.preview).toBeDefined();
      expect(result.preview.statistics.totalDays).toBe(7);
    });
  });
});