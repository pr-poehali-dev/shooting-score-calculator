import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface Shot {
  id: string;
  shooterId: string;
  score: number;
  timestamp: Date;
}

interface Shooter {
  id: string;
  name: string;
  totalScore: number;
  shots: Shot[];
}

export default function Index() {
  const [shooters, setShooters] = useState<Shooter[]>([]);
  const [activeShooterId, setActiveShooterId] = useState<string>('');
  const [newShooterName, setNewShooterName] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerDuration, setTimerDuration] = useState(60);
  const { toast } = useToast();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            toast({
              title: 'Время вышло! ⏱️',
              description: 'Раунд завершен',
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds, toast]);

  const addShooter = () => {
    if (!newShooterName.trim()) return;
    const newShooter: Shooter = {
      id: Date.now().toString(),
      name: newShooterName,
      totalScore: 0,
      shots: [],
    };
    setShooters([...shooters, newShooter]);
    setActiveShooterId(newShooter.id);
    setNewShooterName('');
    toast({
      title: 'Участник добавлен',
      description: `${newShooter.name} готов к стрельбе`,
    });
  };

  const removeShooter = (id: string) => {
    setShooters(shooters.filter((s) => s.id !== id));
    if (activeShooterId === id) {
      setActiveShooterId(shooters[0]?.id || '');
    }
  };

  const addScore = (points: number) => {
    if (!activeShooterId) {
      toast({
        title: 'Выберите участника',
        description: 'Сначала добавьте или выберите стрелка',
        variant: 'destructive',
      });
      return;
    }

    const newShot: Shot = {
      id: Date.now().toString(),
      shooterId: activeShooterId,
      score: points,
      timestamp: new Date(),
    };

    setShooters(
      shooters.map((shooter) => {
        if (shooter.id === activeShooterId) {
          return {
            ...shooter,
            totalScore: shooter.totalScore + points,
            shots: [...shooter.shots, newShot],
          };
        }
        return shooter;
      })
    );

    toast({
      title: points > 0 ? 'Очки добавлены! 🎯' : 'Очки вычтены',
      description: `${points > 0 ? '+' : ''}${points} баллов`,
    });
  };

  const undoLastShot = () => {
    const activeShooter = shooters.find((s) => s.id === activeShooterId);
    if (!activeShooter || activeShooter.shots.length === 0) return;

    const lastShot = activeShooter.shots[activeShooter.shots.length - 1];

    setShooters(
      shooters.map((shooter) => {
        if (shooter.id === activeShooterId) {
          return {
            ...shooter,
            totalScore: shooter.totalScore - lastShot.score,
            shots: shooter.shots.slice(0, -1),
          };
        }
        return shooter;
      })
    );

    toast({
      title: 'Выстрел отменен',
      description: 'Последний результат удален',
    });
  };

  const startTimer = () => {
    setTimerSeconds(timerDuration);
    setIsTimerRunning(true);
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
  };

  const activeShooter = shooters.find((s) => s.id === activeShooterId);
  const timerProgress = timerSeconds > 0 ? (timerSeconds / timerDuration) * 100 : 0;

  const calculateStats = (shooter: Shooter) => {
    if (shooter.shots.length === 0) return { avgScore: 0, maxScore: 0, accuracy: 0 };
    const avgScore = shooter.totalScore / shooter.shots.length;
    const maxScore = Math.max(...shooter.shots.map((s) => s.score));
    const accuracy = (shooter.shots.filter((s) => s.score >= 8).length / shooter.shots.length) * 100;
    return { avgScore: avgScore.toFixed(1), maxScore, accuracy: accuracy.toFixed(0) };
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-2 text-white">Тир 🎯</h1>
          <p className="text-muted-foreground text-lg">Система подсчета очков</p>
        </div>

        <Tabs defaultValue="score" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
            <TabsTrigger value="score">Счет</TabsTrigger>
            <TabsTrigger value="history">История</TabsTrigger>
            <TabsTrigger value="stats">Статистика</TabsTrigger>
          </TabsList>

          <TabsContent value="score" className="space-y-6">
            <Card className="p-6">
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <Input
                  placeholder="Имя участника"
                  value={newShooterName}
                  onChange={(e) => setNewShooterName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addShooter()}
                  className="flex-1"
                />
                <Button onClick={addShooter} className="md:w-auto">
                  <Icon name="UserPlus" size={20} className="mr-2" />
                  Добавить
                </Button>
              </div>

              {shooters.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {shooters.map((shooter) => (
                    <Badge
                      key={shooter.id}
                      variant={shooter.id === activeShooterId ? 'default' : 'outline'}
                      className="cursor-pointer text-base px-4 py-2 hover:scale-105 transition-transform"
                      onClick={() => setActiveShooterId(shooter.id)}
                    >
                      {shooter.name} - {shooter.totalScore}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeShooter(shooter.id);
                        }}
                        className="ml-2 hover:text-destructive"
                      >
                        <Icon name="X" size={16} />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </Card>

            {activeShooter && (
              <Card className="p-8 bg-gradient-to-br from-card to-secondary">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-2">{activeShooter.name}</h2>
                  <div className="text-7xl font-black text-primary mb-4">
                    {activeShooter.totalScore}
                  </div>
                  <p className="text-muted-foreground">Всего выстрелов: {activeShooter.shots.length}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                  {[10, 9, 8, 7, 6].map((points) => (
                    <Button
                      key={points}
                      onClick={() => addScore(points)}
                      size="lg"
                      className="h-20 text-2xl font-bold bg-accent hover:bg-accent/90 hover:scale-105 transition-transform"
                    >
                      {points}
                    </Button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <Button
                    onClick={() => addScore(5)}
                    size="lg"
                    variant="secondary"
                    className="h-16 text-xl font-bold"
                  >
                    +5
                  </Button>
                  <Button
                    onClick={() => addScore(1)}
                    size="lg"
                    variant="secondary"
                    className="h-16 text-xl font-bold"
                  >
                    +1
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={undoLastShot}
                    variant="destructive"
                    size="lg"
                    disabled={activeShooter.shots.length === 0}
                  >
                    <Icon name="Undo2" size={20} className="mr-2" />
                    Отменить
                  </Button>
                  <Button onClick={() => addScore(-1)} variant="outline" size="lg">
                    <Icon name="Minus" size={20} className="mr-2" />
                    Вычесть
                  </Button>
                </div>
              </Card>
            )}

            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <Icon name="Timer" size={24} className="mr-2" />
                Таймер раунда
              </h3>

              <div className="space-y-4">
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    value={timerDuration}
                    onChange={(e) => setTimerDuration(Number(e.target.value))}
                    disabled={isTimerRunning}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">секунд</span>
                </div>

                <div className="text-center">
                  <div className={`text-6xl font-black mb-4 ${isTimerRunning ? 'text-primary pulse-glow' : 'text-white'}`}>
                    {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                  </div>
                  <Progress value={timerProgress} className="h-3 mb-4" />
                </div>

                <div className="flex gap-2">
                  {!isTimerRunning ? (
                    <Button onClick={startTimer} className="flex-1" size="lg">
                      <Icon name="Play" size={20} className="mr-2" />
                      Старт
                    </Button>
                  ) : (
                    <Button onClick={stopTimer} variant="destructive" className="flex-1" size="lg">
                      <Icon name="Pause" size={20} className="mr-2" />
                      Пауза
                    </Button>
                  )}
                  <Button onClick={resetTimer} variant="outline" size="lg">
                    <Icon name="RotateCcw" size={20} className="mr-2" />
                    Сброс
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <Icon name="History" size={24} className="mr-2" />
                История выстрелов
              </h3>

              {shooters.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Добавьте участников для начала</p>
              ) : (
                <div className="space-y-4">
                  {shooters.map((shooter) => (
                    <div key={shooter.id}>
                      <h4 className="font-bold text-lg mb-2">{shooter.name}</h4>
                      {shooter.shots.length === 0 ? (
                        <p className="text-muted-foreground text-sm">Выстрелов пока нет</p>
                      ) : (
                        <div className="grid gap-2">
                          {[...shooter.shots].reverse().map((shot, idx) => (
                            <div
                              key={shot.id}
                              className="flex items-center justify-between p-3 bg-secondary rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                                    shot.score >= 8
                                      ? 'bg-accent text-white'
                                      : shot.score >= 5
                                      ? 'bg-primary text-white'
                                      : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  {shot.score}
                                </div>
                                <div>
                                  <div className="font-medium">Выстрел #{shooter.shots.length - idx}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {shot.timestamp.toLocaleTimeString()}
                                  </div>
                                </div>
                              </div>
                              <Icon name="Target" size={20} className="text-muted-foreground" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="stats">
            <div className="grid gap-6">
              {shooters.length === 0 ? (
                <Card className="p-8">
                  <p className="text-center text-muted-foreground">Добавьте участников для просмотра статистики</p>
                </Card>
              ) : (
                shooters.map((shooter) => {
                  const stats = calculateStats(shooter);
                  return (
                    <Card key={shooter.id} className="p-6">
                      <h3 className="text-2xl font-bold mb-6">{shooter.name}</h3>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-secondary p-4 rounded-lg text-center">
                          <div className="text-3xl font-bold text-primary">{shooter.totalScore}</div>
                          <div className="text-sm text-muted-foreground mt-1">Всего очков</div>
                        </div>
                        <div className="bg-secondary p-4 rounded-lg text-center">
                          <div className="text-3xl font-bold text-accent">{stats.avgScore}</div>
                          <div className="text-sm text-muted-foreground mt-1">Средний балл</div>
                        </div>
                        <div className="bg-secondary p-4 rounded-lg text-center">
                          <div className="text-3xl font-bold text-white">{stats.maxScore}</div>
                          <div className="text-sm text-muted-foreground mt-1">Лучший выстрел</div>
                        </div>
                        <div className="bg-secondary p-4 rounded-lg text-center">
                          <div className="text-3xl font-bold text-primary">{stats.accuracy}%</div>
                          <div className="text-sm text-muted-foreground mt-1">Точность (8+)</div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold mb-3">Распределение очков</h4>
                        <div className="space-y-2">
                          {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((score) => {
                            const count = shooter.shots.filter((s) => s.score === score).length;
                            const percentage = shooter.shots.length > 0 ? (count / shooter.shots.length) * 100 : 0;
                            return (
                              <div key={score} className="flex items-center gap-3">
                                <div className="w-12 text-right font-bold">{score}</div>
                                <div className="flex-1">
                                  <div className="bg-secondary rounded-full h-6 overflow-hidden">
                                    <div
                                      className={`h-full flex items-center px-2 text-sm font-medium ${
                                        score >= 8 ? 'bg-accent' : score >= 5 ? 'bg-primary' : 'bg-muted'
                                      }`}
                                      style={{ width: `${percentage}%` }}
                                    >
                                      {count > 0 && <span>{count}</span>}
                                    </div>
                                  </div>
                                </div>
                                <div className="w-16 text-right text-sm text-muted-foreground">
                                  {percentage.toFixed(0)}%
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
