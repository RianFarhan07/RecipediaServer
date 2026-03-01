import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UpdateProfileDto, ALLOWED_ALLERGIES } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getProfile(userId: string) {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // Validate allergies
    if (dto.allergies) {
      const invalid = dto.allergies.filter(
        (a) => !ALLOWED_ALLERGIES.includes(a),
      );
      if (invalid.length > 0) {
        throw new BadRequestException(
          `Invalid allergies: ${invalid.join(', ')}`,
        );
      }
    }

    return this.usersRepository.updateProfile(userId, dto);
  }
}
