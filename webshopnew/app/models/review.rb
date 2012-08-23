class Review < ActiveRecord::Base
  attr_accessible :description, :rating, :summary
  belongs_to :product
  belongs_to :user
end
